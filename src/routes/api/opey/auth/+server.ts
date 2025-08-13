import { createLogger } from '$lib/utils/logger';
const logger = createLogger('OpeyAuthServer');
import { json } from "@sveltejs/kit";
import type { RequestEvent } from "./$types";
import { DefaultOBPIntegrationService } from "$lib/opey/services/OBPIntegrationService";
import { env } from "$env/dynamic/private";
import type { Session } from "svelte-kit-sessions";


export async function POST(event: RequestEvent) {
    try {
        const session = event.locals.session;
        const accessToken = session?.data?.oauth?.access_token;

        // Check if this is an authenticated request
        if (accessToken) {

            const opeyConsumerId = env.OPEY_CONSUMER_ID;
            if (!opeyConsumerId) {
                // Opey consumer ID is not configured
                // We will return an anonymous session instead, with a warning/error

                logger.warn('Opey consumer ID not configured, returning anonymous session');
                return await _getAnonymousSession('Opey consumer ID not configured, returning anonymous session instead.');
            }

            try {
                // AUTHENTICATED FLOW - Create consent and authenticated Opey session
                return await _getAuthenticatedSession(opeyConsumerId, session);
            } catch (error: any) {
                logger.error('Error creating authenticated Opey session:', error);
                return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
            }

        } else {
            // ANONYMOUS FLOW - Create anonymous Opey session
            return await _getAnonymousSession();
        }

    } catch (error: any) {
        logger.error('Opey Auth error:', error);
        return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}


async function _getAuthenticatedSession(opeyConsumerId: string, portalSession: Session) {
    // AUTHENTICATED FLOW - Create consent and authenticated Opey session

    const obpIntegration = new DefaultOBPIntegrationService(opeyConsumerId);
    const consentJwt = await obpIntegration.getOrCreateOpeyConsent(portalSession);

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
}


async function _getAnonymousSession(error?: string) {
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
    const responseData: any = { success: true, authenticated: false };
    
    if (error) {
        responseData.error = error;
    }
    
    return json(
        responseData,
        setCookieHeaders ? { headers: { 'Set-Cookie': setCookieHeaders } } : {}
    );
}