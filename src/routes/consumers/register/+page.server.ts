import type { RequestEvent, Actions } from "@sveltejs/kit";
import { obp_requests } from "$lib/obp/requests";
import type { OBPConsumerRequestBody } from "$lib/obp/types";

export const actions = {
    default: async ({ request, locals }) => {
        const formData = await request.formData()
        
        console.log("Form Data:", Object.fromEntries(formData.entries()));

        // 
        const formEntries = Object.fromEntries(formData.entries());
        const requestBody: OBPConsumerRequestBody = {
            app_type: formEntries.app_type as 'public' | 'confidential',
            app_name: formEntries.app_name as string,
            redirect_url: formEntries.redirect_url as string,
            developer_email: formEntries.developer_email as string,
            description: formEntries.description as string,
            company: formEntries.company as string
        };

        // Get the access token from the session
        

        const token = locals.session.data.oauth?.access_token;
        if (!token) {
            return {
                error: "No access token found in session."
            };
        }
        // Make request to OBP to register the consumer
        try {
            const response = await obp_requests.post(`/obp/v5.1.0/management/consumers`, token, requestBody);
        } catch (error) {
            console.error("Error registering consumer:", error);
            return {
                error: "Failed to create consumer"
            };
        }

    }
} satisfies Actions