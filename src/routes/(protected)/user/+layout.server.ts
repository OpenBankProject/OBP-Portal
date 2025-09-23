import { createLogger } from '$lib/utils/logger';
const logger = createLogger('UserPageServer');
import type { RequestEvent } from '@sveltejs/kit';
import { obpIntegrationService } from '$lib/opey/services/OBPIntegrationService';
import { env } from '$env/dynamic/private';

export async function load(event: RequestEvent) {
	const session = event.locals.session;
	const userData = session?.data?.user;

	logger.debug('User data from session:', userData);

	let opeyConsentInfo = null;

	// If we have Opey consumer ID configured, get Opey consent info
	if (env.OPEY_CONSUMER_ID) {
		try {
			logger.debug('Checking for Opey consent with consumer ID:', env.OPEY_CONSUMER_ID);

			const existingConsent = await obpIntegrationService.checkExistingOpeyConsent(session);

			if (existingConsent) {
				opeyConsentInfo = {
					hasActiveConsent: true,
					consent: existingConsent
				}
				
				logger.debug(`Active Opey consent found: ${JSON.stringify(existingConsent)}`);
			} else {
				opeyConsentInfo = {
					hasActiveConsent: false,
					message:
						'No active Opey consent found. A consent will be created automatically when you use Opey chat.'
				};
				logger.debug('No active Opey consent found');
			}
		} catch (error) {
			logger.error('Error checking Opey consent:', error);
			opeyConsentInfo = {
				hasActiveConsent: false,
				error: 'Unable to check Opey consent information'
			};
		}
	}

	return {
		userData: userData || null,
		opeyConsentInfo
	};
}
