import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { sveltekitSessionHandle } from 'svelte-kit-sessions';
import RedisStore from 'svelte-kit-connect-redis';
import { Redis } from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from '$env/static/private';
import { obp_oauth } from '$lib/server/oauth';


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

// Middleware to check user authorization
const checkAuthorization: Handle = async ({ event, resolve }) => {
    const session = event.locals.session;

    if (event.url.pathname.startsWith('/user')) {
        console.debug('Checking authorization for user route:', event.url.pathname);
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
