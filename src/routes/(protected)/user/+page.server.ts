import { createLogger } from '$lib/utils/logger';
const logger = createLogger('UserPageServer');
import type { RequestEvent } from '@sveltejs/kit';
import { DefaultOBPIntegrationService } from '$lib/opey/services/OBPIntegrationService';
import { env } from '$env/dynamic/private';
import { obp_requests } from '$lib/obp/requests';
import type { OBPConsent } from '$lib/obp/types';

export async function load(event: RequestEvent) {
	const session = event.locals.session;
	const userData = session?.data?.user;
	const accessToken = session?.data?.oauth?.access_token;

	logger.debug('User data from session:', userData);

	let opeyConsentInfo = null;

	// If user is authenticated and we have Opey consumer ID configured, get Opey consent info
	if (accessToken && env.OPEY_CONSUMER_ID) {
		try {
			logger.debug('Checking for Opey consent with consumer ID:', env.OPEY_CONSUMER_ID);

			const obpIntegration = new DefaultOBPIntegrationService(env.OPEY_CONSUMER_ID);

			// Check for existing Opey consent
			const existingConsentJwt = await obpIntegration.checkExistingOpeyConsent(session);
			logger.debug(
				'checkExistingOpeyConsent returned JWT:',
				existingConsentJwt ? 'JWT found' : 'No JWT'
			);

			if (existingConsentJwt) {
				// Get the full consent details
				const response = await obp_requests.get('/obp/v5.1.0/my/consents', accessToken);
				const consents = response.consents || [];
				logger.debug('Total consents found:', consents.length);

				// Log all consents for debugging
				consents.forEach((consent: OBPConsent, index: number) => {
					logger.debug(
						`Consent ${index}: ID=${consent.consent_id}, ConsumerID=${consent.consumer_id}, Status=${consent.status}`
					);
				});

				const opeyConsent = consents.find(
					(consent: OBPConsent) =>
						consent.consumer_id === env.OPEY_CONSUMER_ID && consent.status === 'ACCEPTED'
				);

				logger.debug('Found matching Opey consent:', opeyConsent ? 'Yes' : 'No');

				if (opeyConsent) {
					opeyConsentInfo = {
						consent_id: opeyConsent.consent_id,
						status: opeyConsent.status,
						created_date: opeyConsent.last_action_date,
						consumer_id: opeyConsent.consumer_id,
						jwt_expires: opeyConsent.jwt_payload?.exp
							? new Date(opeyConsent.jwt_payload.exp * 1000).toISOString()
							: null,
						hasActiveConsent: true
					};
					logger.debug('Active consent info prepared:', opeyConsentInfo);
				} else {
					logger.debug('No matching consent found, looking for any Opey consumer consents...');
					const anyOpeyConsent = consents.find(
						(consent: OBPConsent) => consent.consumer_id === env.OPEY_CONSUMER_ID
					);
					if (anyOpeyConsent) {
						logger.debug(`Found Opey consent but wrong status: ${anyOpeyConsent.status}`);
					}
					opeyConsentInfo = {
						hasActiveConsent: false,
						message: 'Opey consent found but not in ACCEPTED status or no matching consent'
					};
				}
			} else {
				logger.debug('No existing consent JWT found');
				opeyConsentInfo = {
					hasActiveConsent: false,
					message:
						'No active Opey consent found. A consent will be created automatically when you use Opey chat.'
				};
			}
		} catch (error) {
			logger.error('Error fetching Opey consent info:', error);
			opeyConsentInfo = {
				hasActiveConsent: false,
				error: 'Unable to fetch Opey consent information'
			};
		}
	}

	if (userData) {
		return {
			userData,
			opeyConsentInfo
		};
	}

	return {
		userData: null,
		opeyConsentInfo
	};
}
