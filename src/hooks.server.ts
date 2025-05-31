import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { sveltekitSessionHandle } from 'svelte-kit-sessions';
import RedisStore from 'svelte-kit-connect-redis';
import { Redis } from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from '$env/static/private';

let client: Redis

if (!REDIS_HOST || !REDIS_PORT) {
    console.warn('Redis host or port is not set. Using defaults.');

    client = new Redis({
        host: 'http://localhost',
        port: 6379
    });
} else {
    console.debug('Connecting to Redis at:', REDIS_HOST, REDIS_PORT);
    client = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT
    });
}


export const handle: Handle = sequence(
	sveltekitSessionHandle({ secret: 'secret', store: new RedisStore({ client }) }),
    // add other handles here if needed
);

// Declare types for the Session
declare module 'svelte-kit-sessions' {
	interface SessionData {
		currentUserData: {
            user_id: string;
            email: string;
            username: string;
        }
	}
}