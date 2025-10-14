import { type SessionData } from 'svelte-kit-sessions';
import { createLogger } from '$lib/utils/logger';
import { obp_requests } from '$lib/obp/requests';

const logger = createLogger('user/entitlements/+page.server');

export async function load({ locals }) {
    const session = locals.session;
    const userData: SessionData['user'] = session?.data?.user;
    
    // Extract only the serializable data you need from parent
    const accessToken = session?.data?.oauth?.access_token;

    function getEntitlementsList(userData: SessionData['user']) {
        if (!userData || !userData.entitlements) {
            return [];
        }
        return userData.entitlements.list;
    }

    async function getAllAvalilableEntitlements(): Promise<Array<{role: string, requires_bank_id: boolean}>> {
        try {
            const allEntitlements = await obp_requests.get('/obp/v5.1.0/roles', accessToken);
            logger.error('Fetched all possible entitlements:', allEntitlements);
            return allEntitlements.roles;
        } catch (e) {
            logger.error('Error fetching all possible entitlements:', e);
            return [];
        }
    }

    async function getAllBanks(): Promise<Array<{bank_id: string, name: string}>> {
        let banks = [];
        try {
            const banksResponse = await obp_requests.get('/obp/v5.1.0/banks');
            logger.error('Fetched banks:', banksResponse);
            for (const bank of banksResponse.banks) {
                banks.push({
                    bank_id: bank.id,
                    name: bank.full_name
                });
            }
            return banks;
        } catch (e) {
            logger.error('Error fetching banks:', e);
            return [];
        }
    }

    const allBanks = await getAllBanks();
    const allAvailableEntitlements = await getAllAvalilableEntitlements();
    const userEntitlements = getEntitlementsList(userData);

    return {
        allAvailableEntitlements,
        userEntitlements,
        allBanks
    }
}

import { type Actions, redirect } from "@sveltejs/kit";
import type { OBPAddEntitlementBody } from "$lib/obp/types";

export const actions = {
    create: async ({ request, locals, cookies }) => {
        const formData = await request.formData()
        
        logger.debug("Form Data:", Object.fromEntries(formData.entries()));

        // 
        const formEntries = Object.fromEntries(formData.entries());
        const requestBody: OBPAddEntitlementBody = {
            role_name: formEntries.entitlement as string,
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
            const response = await obp_requests.post(`/obp/v5.1.0/my/consumers`, requestBody, token);

            
            logger.info("Consumer created successfully:", response);

            // Store the response data in a secure cookie for the success page
            // Flash Message, will be deleted when the user visits the success page
            cookies.set('consumer_data', JSON.stringify(response), {
                path: '/',
                maxAge: 60, // 1 minute - short lived
                httpOnly: true,
                secure: true,
                sameSite: 'strict'
            });
            
        } catch (error) {
            logger.error("Error registering consumer:", error);
            return {
                error: "Failed to create consumer"
            };
        }



        return redirect(303, `/consumers/register/success`);

    }
} satisfies Actions