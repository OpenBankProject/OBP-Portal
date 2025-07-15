import { oauth2ProviderFactory } from "$lib/oauth/providerFactory";
import type { OAuth2Tokens } from "arctic";
import type { RequestEvent } from "@sveltejs/kit";

import { env } from "$env/dynamic/public";


export async function GET(event: RequestEvent): Promise<Response> {
    const storedState = event.cookies.get("obp_oauth_state");
    const code = event.url.searchParams.get("code");
	const recievedState = event.url.searchParams.get("state");

    
    if (storedState === null || code === null || recievedState === null) {
		return new Response("Please restart the process.", {
			status: 400
		});
	}
    if (storedState !== recievedState) {
        console.log("State mismatch:", storedState, recievedState);
        // State does not match, likely a CSRF attack or user error
		return new Response("Please restart the process.", {
			status: 400
		});
	}

    const [actualState, provider] = storedState.split(":");
    console.log("Received state:", recievedState);
    if (!provider) {
        return new Response("Invalid state format", {
            status: 400
        })
    }

    const oauthClient = oauth2ProviderFactory.getClient(provider);
    if (!oauthClient) {
        console.error(`OAuth client for provider "${provider}" not found.`);
        return new Response("Invalid OAuth provider", {
            status: 400
        });
    }

    let tokens: OAuth2Tokens;
	try {
        // Validate the authorization code and exchange it for tokens
        const token_endpoint = oauthClient.OIDCConfig?.token_endpoint;
        if (!token_endpoint) {
            throw new Error("Token endpoint not found in OIDC configuration.");
        }


		tokens = await oauthClient.validateAuthorizationCode(token_endpoint, code, null);
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
                refresh_token: tokens.refreshToken(),
                provider: provider,
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