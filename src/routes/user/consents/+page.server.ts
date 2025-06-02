import type { RequestEvent } from "@sveltejs/kit";
import { obp_requests } from "$lib/server/obp";


export async function load(event: RequestEvent ) {
    const token = event.locals.session.data.oauth?.access_token;
    if (!token) {
        return {
            error: "No access token found in session."
        };
    }

    const consents = await obp_requests.get('/obp/v5.1.0/my/consents', token)

    return {
        consents: consents.consents,
    }
}

export async function actions(event: RequestEvent) {
    revokeConsent: async ( {request} ) => {}

}