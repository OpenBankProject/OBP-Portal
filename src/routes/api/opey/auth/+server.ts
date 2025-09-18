import { createLogger } from '$lib/utils/logger';
const logger = createLogger('OpeyAuthServer');
import { extractUsernameFromJWT } from '$lib/utils/jwt';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { DefaultOBPIntegrationService } from '$lib/opey/services/OBPIntegrationService';
import { env } from '$env/dynamic/private';
import type { Session } from 'svelte-kit-sessions';

export async function POST(event: RequestEvent) {
	try {
		const session = event.locals.session;
		const accessToken = session?.data?.oauth?.access_token;

		logger.info(
			`POST /api/opey/auth: Session data - has session: ${!!session}, has access token: ${!!accessToken}`
		);

		// Check if this is an authenticated request
		if (accessToken) {
			const opeyConsumerId = env.OPEY_CONSUMER_ID;
			if (!opeyConsumerId) {
				// Opey consumer ID is not configured
				// We will return an anonymous session instead, with a warning/error

				logger.warn('Opey consumer ID not configured, returning anonymous session');
				return await _getAnonymousSession(
					'Opey consumer ID not configured, returning anonymous session instead.'
				);
			}

			try {
				logger.info(
					`POST /api/opey/auth: User is authenticated, attempting authenticated Opey session`
				);
				// AUTHENTICATED FLOW - Create consent and authenticated Opey session
				return await _getAuthenticatedSession(opeyConsumerId, session);
			} catch (error: any) {
				logger.error(
					'❌ Authenticated Opey session failed, falling back to anonymous session:',
					error
				);
				// Fall back to anonymous session with error context
				return await _getAnonymousSession(`Authenticated session failed: ${error.message}`);
			}
		} else {
			logger.info(
				`POST /api/opey/auth: User not authenticated (no access token), using anonymous session`
			);
			// ANONYMOUS FLOW - Create anonymous Opey session
			return await _getAnonymousSession();
		}
	} catch (error: any) {
		logger.error('Opey Auth error:', error);
		return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
	}
}

async function _getAuthenticatedSession(opeyConsumerId: string, portalSession: Session) {
	// AUTHENTICATED FLOW - Create consent and authenticated Opey session

	logger.info(
		`_getAuthenticatedSession: Starting authenticated session creation for consumer ${opeyConsumerId}`
	);

	const obpIntegration = new DefaultOBPIntegrationService(opeyConsumerId);

	// First check what consents exist
	logger.info(`_getAuthenticatedSession: Checking existing consent before creating JWT`);
	const existingConsent = await obpIntegration.checkExistingOpeyConsent(portalSession);
	if (existingConsent) {
		logger.info(`_getAuthenticatedSession: Found existing consent JWT, will use it`);
	} else {
		logger.info(`_getAuthenticatedSession: No existing consent found, will create new one`);
	}

	const consentJwt = await obpIntegration.getOrCreateOpeyConsent(portalSession);
	logger.info(
		`_getAuthenticatedSession: ✅ Retrieved consent JWT (length: ${consentJwt.length} chars)`
	);

	// Extract and log user identifier from consent JWT
	const userIdentifier = extractUsernameFromJWT(consentJwt);
	logger.info(
		`_getAuthenticatedSession says: 🚀 Sending consent JWT to Opey - Making request to ${env.OPEY_BASE_URL}/create-session - Primary user: ${userIdentifier}`
	);

	// Decode JWT payload for time validation debugging (without verifying signature)
	try {
		const jwtParts = consentJwt.split('.');
		if (jwtParts.length === 3) {
			const payloadBase64 = jwtParts[1];
			// Add padding if needed
			const paddedPayload = payloadBase64 + '='.repeat((4 - (payloadBase64.length % 4)) % 4);
			const payloadJson = Buffer.from(paddedPayload, 'base64').toString('utf8');
			const payload = JSON.parse(payloadJson);

			const currentTime = Math.floor(Date.now() / 1000);
			logger.info(`_getAuthenticatedSession: 🕐 JWT Time Analysis:`);
			logger.info(
				`  Current Unix timestamp: ${currentTime} (${new Date(currentTime * 1000).toISOString()})`
			);

			if (payload.exp) {
				const expTime = new Date(payload.exp * 1000).toISOString();
				const timeToExp = payload.exp - currentTime;
				logger.info(`  JWT exp (expires): ${payload.exp} (${expTime}) - ${timeToExp}s from now`);
			}
			if (payload.iat) {
				const iatTime = new Date(payload.iat * 1000).toISOString();
				const timeSinceIat = currentTime - payload.iat;
				logger.info(`  JWT iat (issued at): ${payload.iat} (${iatTime}) - ${timeSinceIat}s ago`);
			}
			if (payload.nbf) {
				const nbfTime = new Date(payload.nbf * 1000).toISOString();
				const timeToNbf = payload.nbf - currentTime;
				logger.info(`  JWT nbf (not before): ${payload.nbf} (${nbfTime}) - ${timeToNbf}s from now`);
			}

			logger.info(`  JWT iss (issuer): ${payload.iss}`);
			logger.info(`  JWT aud (audience): ${payload.aud}`);
			logger.info(`  JWT sub (subject): ${payload.sub}`);
		}
	} catch (jwtDecodeError) {
		logger.warn(
			`_getAuthenticatedSession: Could not decode JWT payload for time analysis:`,
			jwtDecodeError
		);
	}

	// Log first and last 20 chars of JWT for debugging (never log full JWT)
	const jwtPreview =
		consentJwt.length > 40
			? `${consentJwt.substring(0, 20)}...${consentJwt.substring(consentJwt.length - 20)}`
			: consentJwt.substring(0, 20) + '...';
	logger.info(`_getAuthenticatedSession: JWT preview: ${jwtPreview}`);
	logger.info(`_getAuthenticatedSession: 🚀 Making request to Opey create-session endpoint...`);
	logger.info(`_getAuthenticatedSession: Target URL: ${env.OPEY_BASE_URL}/create-session`);

	const opeyResponse = await fetch(`${env.OPEY_BASE_URL}/create-session`, {
		method: 'POST',
		headers: {
			'Consent-JWT': consentJwt,
			'Content-Type': 'application/json'
		}
	});

	logger.info(
		`_getAuthenticatedSession: 📡 Opey responded with status: ${opeyResponse.status} ${opeyResponse.statusText}`
	);

	if (!opeyResponse.ok) {
		const errorText = await opeyResponse.text();
		logger.error(`_getAuthenticatedSession: ❌ Failed to create authenticated Opey session`);
		logger.error(`_getAuthenticatedSession: Primary user: ${userIdentifier}`);
		logger.error(
			`_getAuthenticatedSession: Status: ${opeyResponse.status} ${opeyResponse.statusText}`
		);
		logger.error(`_getAuthenticatedSession: Error response: ${errorText}`);
		throw new Error(`Failed to create authenticated Opey session: ${errorText}`);
	}

	logger.info(
		`_getAuthenticatedSession says: Successfully created authenticated Opey session - Primary user: ${userIdentifier}`
	);

	// Forward the session cookie to the client
	const setCookieHeaders = opeyResponse.headers.get('set-cookie');
	logger.info(
		`_getAuthenticatedSession: ✅ Returning success response with authenticated=true, has cookies: ${!!setCookieHeaders}`
	);
	return json(
		{ success: true, authenticated: true },
		setCookieHeaders ? { headers: { 'Set-Cookie': setCookieHeaders } } : {}
	);
}

async function _getAnonymousSession(error?: string) {
	// ANONYMOUS FLOW - Create anonymous Opey session
	logger.info(
		`_getAnonymousSession says: Creating anonymous Opey session - Making request to ${env.OPEY_BASE_URL}/create-session (no consent JWT)`
	);

	const opeyResponse = await fetch(`${env.OPEY_BASE_URL}/create-session`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		}
		// No Consent-JWT header = anonymous session
	});

	if (!opeyResponse.ok) {
		const errorText = await opeyResponse.text();
		logger.error(
			`_getAnonymousSession says: Failed to create anonymous Opey session - Error: ${errorText}`
		);
		throw new Error(`Failed to create anonymous Opey session: ${errorText}`);
	}

	logger.info(`_getAnonymousSession says: Successfully created anonymous Opey session`);

	// Forward the session cookie to the client
	const setCookieHeaders = opeyResponse.headers.get('set-cookie');
	const responseData: any = { success: true, authenticated: false };

	if (error) {
		responseData.error = error;
	}

	return json(
		responseData,
		setCookieHeaders ? { headers: { 'Set-Cookie': setCookieHeaders } } : {}
	);
}
