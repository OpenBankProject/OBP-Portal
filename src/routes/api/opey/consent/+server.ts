import { createLogger } from '$lib/utils/logger';
const logger = createLogger('OpeyConsentAPI');
import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { env } from '$env/dynamic/private';

/**
 * POST /api/opey/consent
 * 
 * Creates a role-specific consent at OBP for a tool call that requires elevated permissions.
 * The frontend sends the required roles from the consent_request event, and this endpoint:
 * 1. Creates a consent with those specific roles via the OBP API
 * 2. Returns the Consent-JWT to the frontend
 * 
 * The frontend then sends this JWT to the Opey backend via the approval endpoint,
 * where it's injected into the tool call headers (never reaching the LLM).
 */
export async function POST(event: RequestEvent) {
	try {
		const session = event.locals.session;
		const accessToken = session?.data?.oauth?.access_token;

		if (!accessToken) {
			logger.warn('Consent creation attempted without authentication');
			return json({ error: 'Authentication required to create consent' }, { status: 401 });
		}

		const body = await event.request.json();
		const { required_roles, bank_id } = body;
		const normalizedRequiredRoles = required_roles == null ? [] : required_roles;

		logger.info(`Consent request received:`, { required_roles, bank_id });

		if (!Array.isArray(normalizedRequiredRoles)) {
			logger.warn('Invalid required_roles:', required_roles);
			return json({ error: 'required_roles must be an array when provided' }, { status: 400 });
		}

		const opeyConsumerId = env.OPEY_CONSUMER_ID;
		if (!opeyConsumerId) {
			logger.error('OPEY_CONSUMER_ID not configured');
			return json({ error: 'Server configuration error: OPEY_CONSUMER_ID not set' }, { status: 500 });
		}

		// First, get the user's current roles to check what they have access to
		logger.info('Fetching user entitlements to check available roles...');
		const userEntitlements = await obp_requests.get('/obp/v5.1.0/my/entitlements', accessToken);
		const userRoles = (userEntitlements.list || []).map((e: any) => e.role_name);
		logger.info(`User has ${userRoles.length} roles:`, userRoles);

		// Check which required roles the user doesn't have
		const missingRoles = normalizedRequiredRoles.filter((role: string) => !userRoles.includes(role));
		if (missingRoles.length > 0) {
			logger.error(`User is missing required roles:`, missingRoles);
			logger.error(`User has roles:`, userRoles);
			logger.error(`Required roles:`, normalizedRequiredRoles);
			return json({ 
				error: `OBP-35013: You don't have the required roles. Missing: ${missingRoles.join(', ')}. You have: ${userRoles.join(', ')}` 
			}, { status: 403 });
		}

		// Build entitlements array from required roles
		const entitlements = normalizedRequiredRoles.map((roleName: string) => ({
			role_name: roleName,
			bank_id: bank_id || ''
		}));

		const now = new Date().toISOString().split('.')[0] + 'Z';

		const consentBody = {
			everything: false,
			entitlements,
			consumer_id: opeyConsumerId,
			views: [],
			valid_from: now,
			time_to_live: 3600 // 1 hour
		};

		logger.info(`Creating role-specific consent with ${normalizedRequiredRoles.length} roles: ${normalizedRequiredRoles.join(', ')}`);
		logger.info(`Consent body:`, JSON.stringify(consentBody, null, 2));

		const consent = await obp_requests.post(
			'/obp/v5.1.0/my/consents/IMPLICIT',
			consentBody,
			accessToken
		);

		logger.info(`Consent created successfully: ${consent.consent_id}`);

		return json({
			consent_jwt: consent.jwt,
			consent_id: consent.consent_id,
			status: consent.status,
			roles: normalizedRequiredRoles
		});
	} catch (error: any) {
		logger.error('Failed to create consent:', error);
		const message = error?.message || 'Failed to create consent';
		const status = error?.code || 500;
		return json({ error: message }, { status: typeof status === 'number' ? status : 500 });
	}
}
