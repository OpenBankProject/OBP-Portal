import { obp_oauth } from '$lib/server/oauth'
import { generateState } from 'arctic'

import type { RequestEvent } from '@sveltejs/kit'

export function GET(event: RequestEvent) {
    const state = generateState()

    const scopes = ['openid']

    try {
        const auth_endpoint = obp_oauth.OIDCConfig?.authorization_endpoint

        if (!auth_endpoint) {
            throw new Error("Authorization endpoint not found in OIDC configuration.");
        }
        const url = obp_oauth.createAuthorizationURL(auth_endpoint, state, scopes)

        event.cookies.set("obp_oauth_state", state, {
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