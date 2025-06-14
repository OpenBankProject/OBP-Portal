import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { sveltekitSessionHandle } from 'svelte-kit-sessions';
import RedisStore from 'svelte-kit-connect-redis';
import { Redis } from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from '$env/static/private';
import { obp_oauth } from '$lib/oauth/client';
import { refreshAccessTokenInSession } from '$lib/oauth/session';


// Init Redis
let client: Redis

if (!REDIS_HOST || !REDIS_PORT) {
    console.warn('Redis host or port is not set. Using defaults.');

    client = new Redis({
        host: 'localhost',
        port: 6379
    });
} else {
    console.debug('Connecting to Redis at:', REDIS_HOST, REDIS_PORT);
    client = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT
    });
}

// Define all protected routes here
const protectedRoutes = [
    '/user',
    '/consumers'
    // Add more protected routes as needed
];

// Middleware to check user authorization
const checkAuthorization: Handle = async ({ event, resolve }) => {
    const session = event.locals.session;

    // We should check against a list of protected routes here
    if (protectedRoutes.some(route => event.url.pathname.startsWith(route))) {
        console.debug('Checking authorization for user route:', event.url.pathname);
        // Check token expiration
        const accessToken = session?.data.oauth?.access_token;
        if (!accessToken) {
            console.warn('No access token found in session. Redirecting to login.');
            return new Response(null, {
                status: 302,
                headers: {
                    Location: '/login'
                }
            });
        }

        // Check if the access token is expired, 
        // if it is, attempt to refresh it
        if (await obp_oauth.checkAccessTokenExpiration(accessToken)) {
            // will return true if the token is expired
            try {
                await refreshAccessTokenInSession(session, obp_oauth)
            } catch (error) {
                console.error('Error refreshing access token:', error);
                // If the refresh fails, redirect to login
                return new Response(null, {
                    status: 302,
                    headers: {
                        Location: '/login'
                    }
                });
            }
        }

        if (!session || !session.data.user) {
            // Redirect to login page if not authenticated
            return new Response(null, {
                status: 302,
                headers: {
                    Location: '/login'
                }
            });
        } else {
            console.debug('User is authenticated:', session.data.user);
            // Optionally, you can add more checks here, e.g., user roles or permissions
        }
    }

    const response = await resolve(event);

    return response;
}

// Init SvelteKitSessions
export const handle: Handle = sequence(
	sveltekitSessionHandle({ secret: 'secret', store: new RedisStore({ client }) }),
    checkAuthorization,
    // add other handles here if needed
);

// Declare types for the Session
declare module 'svelte-kit-sessions' {
	interface SessionData {
		user?: {
            user_id: string;
            email: string;
            username: string;
        }
        oauth?: {
            access_token: string;
            refresh_token?: string;
        }
	}
}


// Init OAuth client
try { await obp_oauth.initOIDCConfig() } catch (error) {
    console.error('Failed to initialize OAuth client:', error);
    throw error; // rethrow the error to prevent the app from starting
}
