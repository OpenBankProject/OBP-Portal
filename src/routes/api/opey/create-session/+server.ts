import { createLogger } from '$lib/utils/logger';
const logger = createLogger('OpeyCreateSessionProxy');
import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { env } from '$env/dynamic/private';

export async function POST(event: RequestEvent) {
    try {
        logger.debug('Proxying create-session request to Opey II');

        // Debug: Log session info
        const session = event.locals.session;
        logger.debug('Portal session ID:', session?.id || 'no session');
        logger.debug('Portal session data keys:', Object.keys(session?.data || {}));

        // Get the request body
        const body = await event.request.text();
        logger.debug('Request body:', body);

        // Get session cookies to forward to Opey II
        const cookieHeader = event.request.headers.get('cookie');
        logger.debug('Cookie header being forwarded:', cookieHeader || 'no cookies');

        // Build headers for the proxy request
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Forward cookies if present
        if (cookieHeader) {
            headers['Cookie'] = cookieHeader;
        }

        // Forward other relevant headers
        const consentJwt = event.request.headers.get('Consent-JWT');
        if (consentJwt) {
            headers['Consent-JWT'] = consentJwt;
        }

        const authorization = event.request.headers.get('Authorization');
        if (authorization) {
            headers['Authorization'] = authorization;
        }

        // Make the request to Opey II
        logger.debug('Making request to Opey II with headers:', headers);
        const opeyResponse = await fetch(`${env.OPEY_BASE_URL}/create-session`, {
            method: 'POST',
            headers,
            body
        });

        logger.debug('Opey create-session response status:', opeyResponse.status);
        logger.debug('Opey create-session response headers:', Object.fromEntries(opeyResponse.headers.entries()));

        if (!opeyResponse.ok) {
            logger.error(`Opey II returned error: ${opeyResponse.status} ${opeyResponse.statusText}`);
            throw error(opeyResponse.status, `Opey II error: ${opeyResponse.statusText}`);
        }

        // Get the response data
        const responseData = await opeyResponse.json();
        logger.debug('Opey response data:', responseData);

        // Forward any Set-Cookie headers from Opey II
        const setCookieHeaders = opeyResponse.headers.getSetCookie();
        logger.debug('Set-Cookie headers from Opey:', setCookieHeaders);

        const responseHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Create the response
        const response = json(responseData, {
            status: opeyResponse.status,
            headers: responseHeaders
        });

        // Add Set-Cookie headers if present
        if (setCookieHeaders.length > 0) {
            logger.debug('Adding Set-Cookie headers to response:', setCookieHeaders);
            setCookieHeaders.forEach(cookieHeader => {
                response.headers.append('Set-Cookie', cookieHeader);
            });
        } else {
            logger.debug('No Set-Cookie headers to add');
        }

        return response;

    } catch (err) {
        logger.error('Error proxying create-session request:', err);

        if (err && typeof err === 'object' && 'status' in err) {
            throw err; // Re-throw SvelteKit errors
        }

        throw error(500, 'Internal server error while proxying create-session request');
    }
}
