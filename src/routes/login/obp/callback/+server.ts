import { obp_oauth } from "$lib/oauth/client";

import type { OAuth2Tokens } from "arctic";
import type { RequestEvent } from "@sveltejs/kit";

import { env } from "$env/dynamic/public";


export async function GET(event: RequestEvent): Promise<Response> {
    const storedState = event.cookies.get("obp_oauth_state");
    const code = event.url.searchParams.get("code");
	const state = event.url.searchParams.get("state");

    
    if (storedState === null || code === null || state === null) {
		return new Response("Please restart the process.", {
			status: 400
		});
	}
    if (storedState !== state) {
        console.log("State mismatch:", storedState, state);
        // State does not match, likely a CSRF attack or user error
		return new Response("Please restart the process.", {
			status: 400
		});
	}

    let tokens: OAuth2Tokens;
	try {
        // Validate the authorization code and exchange it for tokens
        const token_endpoint = obp_oauth.OIDCConfig?.token_endpoint;
        if (!token_endpoint) {
            throw new Error("Token endpoint not found in OIDC configuration.");
        }


		tokens = await obp_oauth.validateAuthorizationCode(token_endpoint, code, null);
	} catch (e) {
        console.error("Error validating authorization code:", e);
		return new Response("Log in failed, please restart the process.", {
			status: 400
		});
	}

    const obpAccessToken = tokens.accessToken();


    const currentUserUrl = `${env.PUBLIC_OBP_BASE_URL}/obp/v5.1.0/users/current`;
    const currentUserRequest = new Request(currentUserUrl)

    currentUserRequest.headers.set("Authorization", `Bearer ${obpAccessToken}`);
    const currentUserResponse = await fetch(currentUserRequest);
    if (!currentUserResponse.ok) {
        console.error("Failed to fetch current user:", await currentUserResponse.text());
        return new Response("Failed to fetch current user", {
            status: 500
        });
    }
    const user = await currentUserResponse.json();
    console.log("Current user data:", user);

    if (user.user_id && user.email) {
        // Store user data in session
        const { session } = event.locals;
        await session.setData({ 
            user: user,
            oauth: {
                access_token: obpAccessToken,
                refresh_token: tokens.refreshToken()
            }
        });
        await session.save();
        console.log("Session data set:", session.data);
        return new Response(null, {
            status: 302,
            headers: {
                Location: `/`
            }
        });
    }

    
}