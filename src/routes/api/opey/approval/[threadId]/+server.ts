import { createLogger } from '$lib/utils/logger';
const logger = createLogger('OpeyApprovalProxy');
import { error } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { env } from '$env/dynamic/private';

export async function POST(event: RequestEvent) {
    try {
        const { threadId } = event.params;
        logger.debug(`Proxying approval request to Opey II for thread ${threadId}`);

        // Get the request body
        const body = await event.request.text();

        // Get session cookies to forward to Opey II
        const cookieHeader = event.request.headers.get('cookie');

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
        const opeyResponse = await fetch(`${env.OPEY_BASE_URL}/approval/${threadId}`, {
            method: 'POST',
            headers,
            body
        });

        if (!opeyResponse.ok) {
            logger.error(`Opey II returned error: ${opeyResponse.status} ${opeyResponse.statusText}`);
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
        logger.error('Error proxying approval request:', err);

        if (err && typeof err === 'object' && 'status' in err) {
            throw err; // Re-throw SvelteKit errors
        }

        throw error(500, 'Internal server error while proxying approval request');
    }
}
