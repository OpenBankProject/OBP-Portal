import type { RequestEvent, Actions } from "@sveltejs/kit";
import { error } from "@sveltejs/kit";
import type { OBPConsent } from "$lib/obp/types";
import { obp_requests } from "$lib/obp/requests";

const displayConsent = (consent: OBPConsent): boolean => {
    // We want to display the consent if it is revoked and not more than a day old


    // If the consent is not revoked, display it
    if (consent.status !== 'REVOKED') {
        return true;
    }

    const lastActionDate = consent.last_action_date

    const currentDate = new Date();
    const lastAction = new Date(lastActionDate);
    const timeDifference = currentDate.getTime() - lastAction.getTime();

    // Check if the last action date is within the last 24 hours
    if (timeDifference <= 24 * 60 * 60 * 1000) {
        return true;
    }
    return false;

}

export async function load(event: RequestEvent ) {
    const token = event.locals.session.data.oauth?.access_token;
    if (!token) {
        error(401, {
            message: "Unauthorized: No access token found in session.",
        });
    }

    let consentResponse: { consents: OBPConsent[] } | undefined = undefined;

    try {
        consentResponse = await obp_requests.get('/obp/v5.1.0/my/consents', token)
    } catch (e) {
        console.error("Error fetching consents:", e);
        error(500, {
            message: "Could not fetch consents at this time. Please try again later.",
        });
    }

    if (!consentResponse || !consentResponse.consents) {
        error(500, {
            message: "Could not fetch consents at this time. Please try again later.",
        });
    }
    

    let consents = consentResponse.consents
    
    for (let consent of consents) {
        // Filter out consents that should not be displayed
        if (!displayConsent(consent)) {
            // If the consent should not be displayed, set it to null
            consents = consents.filter(c => c.consent_id !== consent.consent_id);
        }
    }

    return {
        consents: consents,
    }
}

export const actions = {
    delete: async ( { request, locals } ) => {
		const data = await request.formData();
        const consentId = data.get('consent_id');

        if (!consentId) {
            return {
                error: "Consent ID is required."
            };
        }

        // Get the access token from the session
        const token = locals.session.data.oauth?.access_token;

        if (!token) {
            return {
                error: "No access token found in session."
            };
        }

        // Make request to OBP to delete the consent
        try {
            const response = await obp_requests.delete(`/obp/v5.1.0/my/consents/${consentId}`, token);
        } catch (error) {
            console.error("Error deleting consent:", error);
            return {
                error: "Failed to delete consent."
            };
        }

        return {
            success: true,
            message: "Consent deleted successfully."
        };
            

	}

} satisfies Actions;