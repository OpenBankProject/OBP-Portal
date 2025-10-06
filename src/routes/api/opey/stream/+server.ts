import { createLogger } from '$lib/utils/logger';
const logger = createLogger('OpeyStreamProxy');
import { error } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { env } from '$env/dynamic/private';

export async function POST(event: RequestEvent) {
    try {
        logger.debug('Proxying stream request to Opey II');

        // Debug: Log session info
        const session = event.locals.session;
        logger.debug('Portal session ID:', session?.id || 'no session');
        logger.debug('Portal session data:', session?.data || 'no session data');

        // Get the request body
        const body = await event.request.text();

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
        const opeyResponse = await fetch(`${env.OPEY_BASE_URL}/stream`, {
            method: 'POST',
            headers,
            body
        });

        if (!opeyResponse.ok) {
            const errorText = await opeyResponse.text();
            logger.error(`Opey II returned error: ${opeyResponse.status} ${opeyResponse.statusText}`);
            logger.error('Opey II error response:', errorText);
            throw error(opeyResponse.status, `Opey II error: ${opeyResponse.statusText}`);
        }

        // Create response headers
        const responseHeaders: Record<string, string> = {
            'Content-Type': opeyResponse.headers.get('Content-Type') || 'text/plain',
        };

        // Forward thread ID header if present
        const threadId = opeyResponse.headers.get('X-Thread-ID');
        if (threadId) {
            responseHeaders['X-Thread-ID'] = threadId;
        }

        // Forward other relevant headers
        const contentLength = opeyResponse.headers.get('Content-Length');
        if (contentLength) {
            responseHeaders['Content-Length'] = contentLength;
        }

        // Return streaming response
        return new Response(opeyResponse.body, {
            status: opeyResponse.status,
            statusText: opeyResponse.statusText,
            headers: responseHeaders
        });

    } catch (err) {
        logger.error('Error proxying stream request:', err);

        if (err && typeof err === 'object' && 'status' in err) {
            throw err; // Re-throw SvelteKit errors
        }

        throw error(500, 'Internal server error while proxying stream request');
    }
}
