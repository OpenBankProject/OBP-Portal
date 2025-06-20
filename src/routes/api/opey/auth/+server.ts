import { json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { DefaultOBPIntegrationService } from "$lib/opey/services/OBPIntegrationService";
import { env } from "$env/dynamic/private";

export async function POST(event: RequestEvent) {
    try {
        const session = event.locals.session;
        const accessToken = session?.data?.oauth?.access_token;

        // Check if this is an authenticated request
        if (accessToken) {
            // AUTHENTICATED FLOW - Create consent and authenticated Opey session
            const opeyConsumerId = env.OPEY_CONSUMER_ID;
            if (!opeyConsumerId) {
                return json({ error: 'Opey consumer ID not configured' }, { status: 500 });
            }

            const obpIntegration = new DefaultOBPIntegrationService(opeyConsumerId);
            const consentJwt = await obpIntegration.getOrCreateOpeyConsent(session);

            const opeyResponse = await fetch(`${env.OPEY_BASE_URL}/create-session`, {
                method: 'POST',
                headers: {
                    'Consent-JWT': consentJwt,
                    'Content-Type': 'application/json'
                }
            });

            if (!opeyResponse.ok) {
                throw new Error(`Failed to create authenticated Opey session: ${await opeyResponse.text()}`);
            }

            // Forward the session cookie to the client
            const setCookieHeaders = opeyResponse.headers.get('set-cookie');
            return json(
                { success: true, authenticated: true },
                setCookieHeaders ? { headers: { 'Set-Cookie': setCookieHeaders } } : {}
            );

        } else {
            // ANONYMOUS FLOW - Create anonymous Opey session
            const opeyResponse = await fetch(`${env.OPEY_BASE_URL}/create-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
                // No Consent-JWT header = anonymous session
            });

            if (!opeyResponse.ok) {
                throw new Error(`Failed to create anonymous Opey session: ${await opeyResponse.text()}`);
            }

            // Forward the session cookie to the client
            const setCookieHeaders = opeyResponse.headers.get('set-cookie');
            return json(
                { success: true, authenticated: false },
                setCookieHeaders ? { headers: { 'Set-Cookie': setCookieHeaders } } : {}
            );
        }

    } catch (error: any) {
        console.error('Opey Auth error:', error);
        return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}