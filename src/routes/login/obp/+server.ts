import { generateState } from 'arctic'
import { oauth2ProviderFactory } from '$lib/oauth/providerFactory'
import type { RequestEvent } from '@sveltejs/kit'

export function GET(event: RequestEvent) {
    const provider = event.url.searchParams.get('provider') || 'keycloak'
    
    const oauthClient = oauth2ProviderFactory.getClient(provider)
    if (!oauthClient) {
        console.error(`OAuth client for provider "${provider}" not found.`);
        return new Response("OAuth provider not configured", {
            status: 500
        });
    }

    const state = generateState()
    // Encode provider in the state - format "state:provider"
    const encodedState = `${state}:${provider}`;

    const scopes = ['openid']

    try {
        const auth_endpoint = oauthClient.OIDCConfig?.authorization_endpoint

        if (!auth_endpoint) {
            throw new Error("Authorization endpoint not found in OIDC configuration.");
        }
        const url = oauthClient.createAuthorizationURL(auth_endpoint, encodedState, scopes)

        event.cookies.set("obp_oauth_state", encodedState, {
            httpOnly: true,
            maxAge: 60 * 10,
            secure: import.meta.env.PROD,
            path: "/",
            sameSite: "lax"
        });
    
        return new Response(null, {
            status: 302,
            headers: {
                Location: url.toString()
            }
        });
    } catch (error) {
        console.error("Error during OBP OAuth login:", error);
        return new Response("Internal Server Error", {
            status: 500
        });
    }

    // can also use createAuthorizationURLWithPKCE method
} 