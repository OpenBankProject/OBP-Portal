import { createLogger } from '$lib/utils/logger';
const logger = createLogger('OpeyStatusProxy');
import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { env } from '$env/dynamic/private';

export async function GET(event: RequestEvent) {
    try {
        logger.debug('Proxying status request to Opey II');

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
        const opeyResponse = await fetch(`${env.OPEY_BASE_URL}/status`, {
            method: 'GET',
            headers
        });

        if (!opeyResponse.ok) {
            logger.error(`Opey II returned error: ${opeyResponse.status} ${opeyResponse.statusText}`);
            throw error(opeyResponse.status, `Opey II error: ${opeyResponse.statusText}`);
        }

        // Get the response data
        const responseData = await opeyResponse.json();

        const responseHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Create the response
        return json(responseData, {
            status: opeyResponse.status,
            headers: responseHeaders
        });

    } catch (err) {
        logger.error('Error proxying status request:', err);

        if (err && typeof err === 'object' && 'status' in err) {
            throw err; // Re-throw SvelteKit errors
        }

        throw error(500, 'Internal server error while proxying status request');
    }
}
