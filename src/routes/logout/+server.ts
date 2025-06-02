import { obp_oauth } from "$lib/server/oauth";
import type { RequestEvent } from "@sveltejs/kit";
import { OBP_BASE_URL } from "$env/static/private";
// Response is a global type, no need to import it

export async function GET(event: RequestEvent): Promise<Response> {
    const tokenRevokationUrl = obp_oauth.OIDCConfig?.revocation_endpoint;
    if (!tokenRevokationUrl) {
        console.error("No revocation endpoint found in OIDC configuration.");
        return new Response("Internal Server Error", { status: 500 });
    }

    const { session } = event.locals;
    if (!session || !session.data.user) {
        console.warn("No user session found, nothing to revoke.");
        return new Response(null, {
            status: 302,
            headers: {
                Location: `/`
            }
        });
    }

    // Revoke the access token if it exists
    const accessToken = session.data.oauth?.access_token;

    // Clear the session cookie, destroy the session
    await session.destroy();


    if (!accessToken) {
        console.warn("No access token found in session, could not revoke.");

        return new Response(null, {
            status: 302,
            headers: {
                Location: '/'
            }
        });
    } else {
        // Revoke the access token
        console.debug("Revoking access token:", accessToken);
        console.log("Revoking access token for user:", session.data.user.user_id);
        obp_oauth.revokeToken(tokenRevokationUrl, accessToken)
    }

    // Redirect to the home page after revocation
    return new Response(null, {
        status: 302,
        headers: {
            Location: `/`
        }
    });


}
