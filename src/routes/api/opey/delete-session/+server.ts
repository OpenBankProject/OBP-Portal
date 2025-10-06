import { createLogger } from '$lib/utils/logger';
const logger = createLogger('OpeyDeleteSessionProxy');
import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { env } from '$env/dynamic/private';

export async function POST(event: RequestEvent) {
    try {
        logger.debug('Proxying delete-session request to Opey II');

        // Get session cookies to forward to Opey II
        const cookieHeader = event.request.headers.get('cookie');

        // Build headers for the proxy request
        const headers: Record<string, string> = {};

        // Forward cookies if present
        if (cookieHeader) {
            headers['Cookie'] = cookieHeader;
        }

        // Forward other relevant headers
        const authorization = event.request.headers.get('Authorization');
        if (authorization) {
            headers['Authorization'] = authorization;
        }

        // Make the request to Opey II
        const opeyResponse = await fetch(`${env.OPEY_BASE_URL}/delete-session`, {
            method: 'POST',
            headers
        });

        if (!opeyResponse.ok) {
            logger.error(`Opey II returned error: ${opeyResponse.status} ${opeyResponse.statusText}`);
            throw error(opeyResponse.status, `Opey II error: ${opeyResponse.statusText}`);
        }

        // Get the response data (if any)
        let responseData = null;
        const contentType = opeyResponse.headers.get('Content-Type');

        if (contentType && contentType.includes('application/json')) {
            try {
                responseData = await opeyResponse.json();
            } catch {
                // Response might be empty, that's ok for delete operations
            }
        }

        // Forward any Set-Cookie headers from Opey II to clear session cookies
        const setCookieHeaders = opeyResponse.headers.getSetCookie();

        const responseHeaders: Record<string, string> = {};

        // Create the response
        const response = json(responseData || { success: true }, {
            status: opeyResponse.status,
            headers: responseHeaders
        });

        // Add Set-Cookie headers if present (to clear session cookies)
        if (setCookieHeaders.length > 0) {
            setCookieHeaders.forEach(cookieHeader => {
                response.headers.append('Set-Cookie', cookieHeader);
            });
        }

        return response;

    } catch (err) {
        logger.error('Error proxying delete-session request:', err);

        if (err && typeof err === 'object' && 'status' in err) {
            throw err; // Re-throw SvelteKit errors
        }

        throw error(500, 'Internal server error while proxying delete-session request');
    }
}
