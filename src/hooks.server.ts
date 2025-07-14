import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { sveltekitSessionHandle } from 'svelte-kit-sessions';
import RedisStore from 'svelte-kit-connect-redis';
import { Redis } from 'ioredis';
import { env } from '$env/dynamic/private';
import { obp_oauth } from '$lib/oauth/client';
import { obp_requests } from '$lib/obp/requests';
import { refreshAccessTokenInSession } from '$lib/oauth/session';

// Startup scripts
// Init Redis
let client: Redis
if (!env.REDIS_HOST || !env.REDIS_PORT) {
    console.warn('Redis host or port is not set. Using defaults.');

    client = new Redis({
        host: 'localhost',
        port: 6379
    });
} else {
    console.debug('Connecting to Redis at:', env.REDIS_HOST, env.REDIS_PORT);
    console.debug('Redis password provided:', !!env.REDIS_PASSWORD);
    
    const redisConfig: any = {
        host: env.REDIS_HOST,
        port: parseInt(env.REDIS_PORT),
    };
    if (env.REDIS_PASSWORD) {
        redisConfig.password = env.REDIS_PASSWORD;
    }

    client = new Redis(redisConfig);
}


/**
 * Initializes OAuth2 providers by fetching well-known configuration URIs from the OBP API
 * and setting up OIDC clients for supported providers.
 * 
 * This function retrieves a list of OAuth2 provider configurations from the OBP well-known
 * endpoint and initializes OIDC clients for each supported provider. Currently supports
 * Keycloak as an OAuth2 provider.
 * 
 * @throws {Error} When no OAuth2 providers can be initialized, preventing user authentication
 * 
 * @remarks
 * - Fetches provider configurations from `/obp/v5.1.0/well-known` endpoint
 * - Currently only supports Keycloak provider initialization
 * - Logs warnings for unsupported providers and errors for failed initializations
 * - Throws an error if no providers are successfully initialized to prevent app startup
 * 
 * @example
 * ```typescript
 * // Initialize OAuth2 providers during application startup
 * await initOauth2Providers();
 * ```
 */
async function initOauth2Providers() {

    interface WellKnownUri {
        provider: string;
        url: string;
    }

    let providers = []

    try {
        const wellKnownUrisResponse = await obp_requests.get('/obp/v5.1.0/well-known');
        const wellKnownUris: WellKnownUri[] = wellKnownUrisResponse.well_known_uris;
        console.debug('Well-known URIs fetched successfully:', wellKnownUris);

        for (const providerUri of wellKnownUris) {
            switch (providerUri.provider) {
                case 'keycloak':
                    // OBP Uses keycloak at the moment, so init OBP Oauth client
                    try {
                        await obp_oauth.initOIDCConfig(providerUri.url);

                        providers.push(providerUri)
                    } catch (error) {
                        console.error(`Failed to initialize OAuth2 client for provider ${providerUri.provider}: ${error}`);
                    }
                    break;
                
                // Add more providers as needed
                default:
                    console.warn(`Unsupported OAuth2 provider: ${providerUri.provider}. Skipping initialization.`);
                    break;

            }   
        }

        // If no providers were found, throw an error
        if (providers.length === 0) {
            throw new Error('Could no initialize any OAuth2 provider. No way to log in. Please check your OBP configuration.');
        }
    } catch (error) {
        console.error('Failed to init OAuth2 providers: ', error);
        // rethrow the error to prevent the app from starting
        throw error
    }
}
// Init OAuth2 providers
try {
    await initOauth2Providers();
} catch (error) {
    console.error('Error initializing OAuth2 providers:', error);
    throw error
}

// Get WebUI props from OBP
// try {
//     const webuiProps = await obp_requests.get('/obp/v5.1.0/webui-props');
//     console.debug('WebUI props fetched successfully:', webuiProps);
// } catch (error) {
//     // Handle the error as needed, e.g., log it, throw it, etc.
//     throw error
// }


function needsAuthorization(routeId: string): boolean {
    // protected routes are put in the /(protected)/ route group
    return routeId.startsWith('/(protected)/')
}
// Middleware to check user authorization
const checkAuthorization: Handle = async ({ event, resolve }) => {
    const session = event.locals.session;
    const routeId = event.route.id;

    if (!!routeId && needsAuthorization(routeId)) {
        console.debug('Checking authorization for user route:', event.url.pathname);
        // Check token expiration
        const accessToken = session?.data.oauth?.access_token;
        if (!accessToken) {
            console.warn('No access token found in session. Redirecting to login.');
            
            await session.destroy();
            
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
                // Destroy the session
                console.warn('Destroying session due to failed token refresh.');
                await session.destroy();

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

