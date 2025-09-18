import { createLogger } from '$lib/utils/logger';
const logger = createLogger('UserConsentsServer');
import type { RequestEvent, Actions } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import type { OBPConsent } from '$lib/obp/types';
import { obp_requests } from '$lib/obp/requests';
import { env } from '$env/dynamic/private';
import { DefaultOBPIntegrationService } from '$lib/opey/services/OBPIntegrationService';

const displayConsent = (consent: OBPConsent): boolean => {
	// We want to display the consent if it is revoked and not more than a day old

	// If the consent is not revoked, display it
	if (consent.status !== 'REVOKED') {
		return true;
	}

	const lastActionDate = consent.last_action_date;

	const currentDate = new Date();
	const lastAction = new Date(lastActionDate);
	const timeDifference = currentDate.getTime() - lastAction.getTime();

	// Check if the last action date is within the last 24 hours
	return timeDifference <= 24 * 60 * 60 * 1000;
};

export async function load(event: RequestEvent) {
	const token = event.locals.session.data.oauth?.access_token;
	if (!token) {
		error(401, {
			message: 'Unauthorized: No access token found in session.'
		});
	}

	let consentResponse: { consents: OBPConsent[] } | undefined = undefined;

	try {
		consentResponse = await obp_requests.get('/obp/v5.1.0/my/consents', token);
	} catch (e) {
		logger.error('Error fetching consents:', e);
		error(500, {
			message: 'Could not fetch consents at this time. Please try again later.'
		});
	}

	if (!consentResponse || !consentResponse.consents) {
		error(500, {
			message: 'Could not fetch consents at this time. Please try again later.'
		});
	}

	let consents = consentResponse.consents;

	for (let consent of consents) {
		// Filter out consents that should not be displayed
		if (!displayConsent(consent)) {
			// If the consent should not be displayed, set it to null
			consents = consents.filter((c) => c.consent_id !== consent.consent_id);
		}
	}

	// Split consents into Opey and Other consents
	const opeyConsents = consents.filter(
		(consent: OBPConsent) => consent.consumer_id === env.OPEY_CONSUMER_ID
	);

	const otherConsents = consents.filter(
		(consent: OBPConsent) => consent.consumer_id !== env.OPEY_CONSUMER_ID
	);

	// Validate Opey consents with actual Opey service if configured
	if (env.OPEY_CONSUMER_ID && env.OPEY_BASE_URL) {
		const obpIntegration = new DefaultOBPIntegrationService(env.OPEY_CONSUMER_ID);

		for (const consent of opeyConsents) {
			try {
				// Get the full consent with JWT for validation
				const consentWithJwt = await obp_requests.get(
					`/obp/v5.1.0/user/current/consents/${consent.consent_id}`,
					token
				);

				if (consentWithJwt.jwt) {
					const validationResult = await obpIntegration.validateConsentJWT(consentWithJwt.jwt);
					// Add Opey validation results to consent object
					(consent as any).opey_validation = {
						valid: validationResult.valid,
						error: validationResult.error,
						tested_at: new Date().toISOString()
					};
				} else {
					(consent as any).opey_validation = {
						valid: false,
						error: 'No JWT available for validation',
						tested_at: new Date().toISOString()
					};
				}
			} catch (validationError) {
				logger.error(`Error validating consent ${consent.consent_id} with Opey:`, validationError);
				(consent as any).opey_validation = {
					valid: false,
					error: `Validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`,
					tested_at: new Date().toISOString()
				};
			}
		}
	}

	// Sort both arrays by created date, most recent first (only if created_date exists)
	const sortByCreatedDate = (a: OBPConsent, b: OBPConsent) => {
		const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
		const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
		return dateB - dateA; // Most recent first
	};

	opeyConsents.sort(sortByCreatedDate);
	otherConsents.sort(sortByCreatedDate);

	return {
		opeyConsents,
		otherConsents,
		opeyConsumerId: env.OPEY_CONSUMER_ID
	};
}

export const actions = {
	delete: async ({ request, locals }) => {
		const data = await request.formData();
		const consentId = data.get('consent_id');

		if (!consentId) {
			return {
				error: 'Consent ID is required.'
			};
		}

		// Get the access token from the session
		const token = locals.session.data.oauth?.access_token;

		if (!token) {
			return {
				error: 'No access token found in session.'
			};
		}

		// Make request to OBP to delete the consent
		try {
			const response = await obp_requests.delete(`/obp/v5.1.0/my/consents/${consentId}`, token);
		} catch (error) {
			logger.error('Error deleting consent:', error);
			return {
				error: 'Failed to delete consent.'
			};
		}

		return {
			success: true,
			message: 'Consent deleted successfully.'
		};
	}
} satisfies Actions;
