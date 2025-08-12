import { createLogger } from '$lib/utils/logger';
const logger = createLogger('LogoutServer');
import { SessionOAuthHelper } from "$lib/oauth/sessionHelper";
import type { RequestEvent } from "@sveltejs/kit";
// Response is a global type, no need to import it

export async function GET(event: RequestEvent): Promise<Response> {
    
    const session = event.locals.session;
    if (!session || !session.data.user) {
        logger.warn("No user session found, nothing to revoke.");
        return new Response(null, {
            status: 302,
            headers: {
                Location: `/`
            }
        });
    }

    const sessionOAuth = SessionOAuthHelper.getSessionOAuth(session)
    if (!sessionOAuth) {
        logger.warn("No OAuth session found, nothing to revoke.");
        return new Response(null, {
            status: 302,
            headers: {
                Location: `/`
            }
        });
    }

    const tokenRevokationUrl = sessionOAuth.client.OIDCConfig?.revocation_endpoint;
    if (!tokenRevokationUrl) {
        logger.error("No revocation endpoint found in OIDC configuration.");
        return new Response("Internal Server Error", { status: 500 });
    }
    

    // Revoke the access token if it exists
    const accessToken = session.data.oauth?.access_token;
    // Clear the session cookie, destroy the session
    event.cookies.delete("session", {
        path: "/",
    })
    await session.destroy();


    if (!accessToken) {
        logger.warn("No access token found in session, could not revoke.");
        return new Response(null, {
            status: 302,
            headers: {
                Location: '/'
            }
        });
    } else {
        // Revoke the access token
        // logger.debug("Revoking access token:", accessToken);
        logger.info("Revoking access token for user:", session.data.user.user_id);
        sessionOAuth.client.revokeToken(tokenRevokationUrl, accessToken)
    }

    // Redirect to the home page after revocation
    return new Response(null, {
        status: 302,
        headers: {
            Location: `/`
        }
    });


}
