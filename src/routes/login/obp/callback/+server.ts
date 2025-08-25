import { createLogger } from '$lib/utils/logger';
const logger = createLogger('OBPLoginCallback');
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
        logger.warn("State mismatch:", storedState, recievedState);
        // State does not match, likely a CSRF attack or user error
		return new Response("Please restart the process.", {
			status: 400
		});
	}

    const [actualState, provider] = storedState.split(":");
    logger.debug("Received state:", recievedState);
    if (!provider) {
        return new Response("Invalid state format", {
            status: 400
        })
    }

    const oauthClient = oauth2ProviderFactory.getClient(provider);
    if (!oauthClient) {
        logger.error(`OAuth client for provider "${provider}" not found.`);
        return new Response("Invalid OAuth provider", {
            status: 400
        });
    }

    // Validate the authorization code and exchange it for tokens
    const token_endpoint = oauthClient.OIDCConfig?.token_endpoint;
    if (!token_endpoint) {
        logger.error("Token endpoint not found in OIDC configuration.");
        return new Response("OAuth configuration error", { status: 500 });
    }

    let tokens: OAuth2Tokens;
    try {
        tokens = await oauthClient.validateAuthorizationCode(token_endpoint, code, null);
    } catch (e) {
        logger.error("Error validating authorization code:", e);
        return new Response("Log in failed, please restart the process.", {
            status: 400
        });
    }

    // Get rid of the state cookie
    event.cookies.delete("obp_oauth_state", {
        path: "/",
    })

    const obpAccessToken = tokens.accessToken();

    logger.debug(`PUBLIC_OBP_BASE_URL from env: ${env.PUBLIC_OBP_BASE_URL}`);
    const currentUserUrl = `${env.PUBLIC_OBP_BASE_URL}/obp/v5.1.0/users/current`;
    logger.info("Fetching current user from OBP:", currentUserUrl);
    const currentUserRequest = new Request(currentUserUrl)

    currentUserRequest.headers.set("Authorization", `Bearer ${obpAccessToken}`);
    logger.debug("Making OBP current user request with access token");
    const currentUserResponse = await fetch(currentUserRequest);
    if (!currentUserResponse.ok) {
        const errorText = await currentUserResponse.text(); logger.error(`OBP current user request failed - Status: ${currentUserResponse.status}, Response: ${errorText}`);
        return new Response("Failed to fetch current user", {
            status: 500
        });
    }
    const user = await currentUserResponse.json();
    logger.info(`Successfully fetched current user from OBP - User ID: ${user.user_id}, Email: ${user.email}, Username: ${user.username || "N/A"}`); logger.debug("Full current user data:", user);

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
        logger.debug("Session data set:", session.data);
        return new Response(null, {
            status: 302,
            headers: {
                Location: `/`
            }
        });
    } else {
        logger.error("Invalid user data received from OBP - missing user_id or email");
        return new Response("Authentication failed - invalid user data", {
            status: 400
        });
    }
}