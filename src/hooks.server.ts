import { createLogger } from '$lib/utils/logger';
const logger = createLogger('HooksServer');
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { sveltekitSessionHandle } from 'svelte-kit-sessions';
import RedisStore from 'svelte-kit-connect-redis';
import { Redis } from 'ioredis';
import { env } from '$env/dynamic/private';
import { obp_requests } from '$lib/obp/requests';
import { oauth2ProviderFactory, type WellKnownUri } from '$lib/oauth/providerFactory';
import { SessionOAuthHelper } from '$lib/oauth/sessionHelper';

// Constants
const DEFAULT_PORT = 5174;

// Check if server is running on non-default port
function checkServerPort() {
	// Check common port environment variables
	const envPort = process.env.PORT || process.env.VITE_PORT || process.env.SERVER_PORT;

	if (envPort && parseInt(envPort) !== DEFAULT_PORT) {
		logger.warn(
			`⚠️  WARNING: Server is configured to run on port ${envPort}, but the default port is ${DEFAULT_PORT}.`
		);
		logger.warn(`   This may cause issues with OAuth callbacks and other integrations.`);
		logger.warn(`   Consider using the default port or updating your configuration accordingly.`);
	}

	// Check process arguments for --port flag
	const portArg = process.argv.find((arg) => arg.startsWith('--port='));
	if (portArg) {
		const argPort = parseInt(portArg.split('=')[1]);
		if (argPort !== DEFAULT_PORT) {
			logger.warn(
				`⚠️  WARNING: Server started with --port=${argPort}, but the default port is ${DEFAULT_PORT}.`
			);
			logger.warn(`   This may cause issues with OAuth callbacks and other integrations.`);
			logger.warn(`   Consider using the default port or updating your configuration accordingly.`);
		}
	}
}

// Startup scripts
// Check server port
checkServerPort();

// Init Redis
let client: Redis;
if (!env.REDIS_HOST || !env.REDIS_PORT) {
	logger.warn('Redis host or port is not set. Using defaults.');

	client = new Redis({
		host: 'localhost',
		port: 6379
	});
} else {
	logger.debug('Connecting to Redis at:', env.REDIS_HOST, env.REDIS_PORT);
	logger.debug('Redis password provided:', !!env.REDIS_PASSWORD);

	const redisConfig: any = {
		host: env.REDIS_HOST,
		port: parseInt(env.REDIS_PORT)
	};
	if (env.REDIS_PASSWORD) {
		redisConfig.password = env.REDIS_PASSWORD;
	}

	client = new Redis(redisConfig);
}

async function fetchWellKnownUris(): Promise<WellKnownUri[]> {
	try {
		const response = await obp_requests.get('/obp/v5.1.0/well-known');
		return response.well_known_uris;
	} catch (error) {
		logger.error('Failed to fetch well-known URIs:', error);
		throw error;
	}
}

async function initOauth2Providers() {
	let providers = [];

	try {
		const wellKnownUris: WellKnownUri[] = await fetchWellKnownUris();
		logger.debug('Well-known URIs fetched successfully:', wellKnownUris);

		for (const providerUri of wellKnownUris) {
			const oauth2Client = await oauth2ProviderFactory.initializeProvider(providerUri);
			if (oauth2Client) {
				providers.push(providerUri);
			}
		}

		for (const registeredStrategy of oauth2ProviderFactory.getSupportedProviders()) {
			if (!providers.find((p) => p.provider === registeredStrategy)) {
				logger.warn(
					`No OAuth2 provider initialized for registered strategy: ${registeredStrategy}`
				);
			}
		}

		// If no providers were found, log error and return
		if (providers.length === 0) {
			logger.error(
				'Could not initialize any OAuth2 provider. Please check your OBP configuration.'
			);
			return;
		}
	} catch (error) {
		logger.error('Failed to init OAuth2 providers: ', error);
		throw error;
	}
}

async function initWebUIProps() {
	try {
		const webuiProps = await obp_requests.get('/obp/v5.1.0/webui-props');
		logger.info('WebUI props fetched successfully:', webuiProps);
		return webuiProps;
	} catch (error) {
		logger.error('Failed to fetch WebUI props:', error);
		throw error;
	}
}

// Init OAuth2 providers
try {
	await initOauth2Providers();
} catch (error) {
	logger.error('Error initializing OAuth2 providers:', error);
	throw error;
}

// Get WebUI props from OBP
// try {
//     const webuiProps = await obp_requests.get('/obp/v5.1.0/webui-props');
//     logger.debug('WebUI props fetched successfully:', webuiProps);
// } catch (error) {
//     // Handle the error as needed, e.g., log it, throw it, etc.
//     throw error
// }

function needsAuthorization(routeId: string): boolean {
	// protected routes are put in the /(protected)/ route group
	return routeId.startsWith('/(protected)/');
}
// Middleware to check user authorization
const checkAuthorization: Handle = async ({ event, resolve }) => {
	const session = event.locals.session;
	const routeId = event.route.id;

	if (!!routeId && needsAuthorization(routeId)) {
		logger.debug('Checking authorization for user route:', event.url.pathname);
		// Check token expiration
		const sessionOAuth = SessionOAuthHelper.getSessionOAuth(session);
		if (!sessionOAuth) {
			logger.warn('No valid OAuth data found in session. Redirecting to login.');
			// Redirect to login page if no OAuth data is found
			return new Response(null, {
				status: 302,
				headers: {
					Location: '/login'
				}
			});
		}

		// Check if the access token is expired,
		// if it is, attempt to refresh it
		if (await sessionOAuth.client.checkAccessTokenExpiration(sessionOAuth.accessToken)) {
			// will return true if the token is expired
			try {
				await SessionOAuthHelper.refreshAccessToken(session);
			} catch (error) {
				logger.info(
					'Token refresh failed - redirecting user to login (normal OAuth behavior):',
					error
				);
				// If the refresh fails, redirect to login
				// Destroy the session
				logger.info('Destroying expired session and redirecting to login.');
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
			logger.debug('User is authenticated:', session.data.user);
			// Optionally, you can add more checks here, e.g., user roles or permissions
		}
	}

	const response = await resolve(event);

	return response;
};

// Init SvelteKitSessions
export const handle: Handle = sequence(
	sveltekitSessionHandle({ secret: 'secret', store: new RedisStore({ client }) }),
	checkAuthorization
	// add other handles here if needed
);

// Declare types for the Session
declare module 'svelte-kit-sessions' {
	interface SessionData {
		user?: {
			user_id: string;
			email: string;
			username: string;
		};
		oauth?: {
			access_token: string;
			refresh_token?: string;
			provider: string;
		};
	}
}
