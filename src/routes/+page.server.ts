import { createLogger } from '$lib/utils/logger';
const logger = createLogger('IndexPageServer');
import type { RequestEvent } from '@sveltejs/kit';
import { DefaultOBPIntegrationService } from '$lib/opey/services/OBPIntegrationService';
import { env } from '$env/dynamic/private';
import { obp_requests } from '$lib/obp/requests';
import type { OBPConsent } from '$lib/obp/types';

export async function load(event: RequestEvent) {
	const session = event.locals.session;
	const accessToken = session?.data?.oauth?.access_token;
	const username = session?.data?.user?.username || null;

	let opeyConsentStatus = 'none'; // 'none', 'initiated', 'ready'
	let opeyConsentReferenceId = null;

	// If user is authenticated and we have Opey consumer ID configured, check Opey consent status
	if (accessToken && env.OPEY_CONSUMER_ID) {
		try {
			// Get all consents for the user
			const response = await obp_requests.get('/obp/v5.1.0/my/consents', accessToken);
			const consents = response.consents || [];

			// Find Opey consent
			const opeyConsent = consents.find(
				(consent: OBPConsent) => consent.consumer_id === env.OPEY_CONSUMER_ID
			);

			if (opeyConsent) {
				opeyConsentReferenceId = opeyConsent.consent_reference_id;
				if (opeyConsent.status === 'ACCEPTED') {
					opeyConsentStatus = 'ready';
				} else if (opeyConsent.status === 'INITIATED') {
					opeyConsentStatus = 'initiated';
				} else {
					opeyConsentStatus = 'none';
				}
			} else {
				opeyConsentStatus = 'none';
			}

			logger.debug(`Opey consent status for user ${username}: ${opeyConsentStatus}`);
		} catch (error) {
			logger.error('Error checking Opey consent status:', error);
			opeyConsentStatus = 'none';
		}
	}

	return {
		username,
		opeyConsentStatus,
		opeyConsentReferenceId
	};
}