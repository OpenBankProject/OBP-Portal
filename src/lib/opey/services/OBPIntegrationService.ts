import { createLogger } from '$lib/utils/logger';
const logger = createLogger('OBPIntegrationService');
import { extractUsernameFromJWT } from '$lib/utils/jwt';
import type { Session } from 'svelte-kit-sessions';
import { obp_requests } from '$lib/obp/requests';
import type { OBPConsent } from '$lib/obp/types';
import { env } from '$env/dynamic/private';

export interface OBPIntegrationService {
	getOrCreateOpeyConsent(session: Session): Promise<string>;
	checkExistingOpeyConsent(session: Session): Promise<string | null>;
}

export class DefaultOBPIntegrationService implements OBPIntegrationService {
	constructor(private opeyConsumerId: string) {}

	async getOrCreateOpeyConsent(session: Session): Promise<string> {
		logger.info('🔄 getOrCreateOpeyConsent: STARTING consent retrieval/creation process');

		if (!session.data.oauth?.access_token) {
			logger.error('getOrCreateOpeyConsent: No access token available');
			throw new Error('User not authenticated with OBP');
		}

		logger.info('getOrCreateOpeyConsent: Checking for existing consent...');
		// Check for existing consent first
		const existingConsentId = await this.checkExistingOpeyConsent(session);

		if (existingConsentId) {
			logger.info('getOrCreateOpeyConsent: ✅ Got existing consent JWT, extracting username...');
			const userIdentifier = extractUsernameFromJWT(existingConsentId);
			logger.info(
				`getOrCreateOpeyConsent says: ✅ FOUND existing consent JWT - Primary user: ${userIdentifier}`
			);
			logger.info(
				`getOrCreateOpeyConsent: ✅ RETURNING existing JWT (length: ${existingConsentId.length})`
			);
			return existingConsentId;
		}

		logger.warn('getOrCreateOpeyConsent: No existing consent found, creating new one...');
		// Create new consent
		const consent = await this.createImplicitConsent(session.data.oauth.access_token);
		const userIdentifier = extractUsernameFromJWT(consent.jwt);
		logger.info(
			`getOrCreateOpeyConsent says: ✅ CREATED new consent JWT - Primary user: ${userIdentifier}`
		);
		logger.info(`getOrCreateOpeyConsent: ✅ RETURNING new JWT (length: ${consent.jwt.length})`);
		return consent.jwt;
	}

	async checkExistingOpeyConsent(session: Session): Promise<string | null> {
		if (!session.data.oauth?.access_token) {
			logger.info('checkExistingOpeyConsent: No access token available');
			return null;
		}

		try {
			logger.info('checkExistingOpeyConsent: Fetching consents from OBP...');
			const response = await obp_requests.get(
				'/obp/v5.1.0/my/consents',
				session.data.oauth.access_token
			);

			logger.info('checkExistingOpeyConsent: Response received from OBP');
			const consents = response.consents || [];

			logger.info(`checkExistingOpeyConsent: Found ${consents.length} total consents`);
			logger.info(`checkExistingOpeyConsent: Looking for consumer_id: ${this.opeyConsumerId}`);

			// First, let's see all Opey consents
			try {
				const opeyConsents = consents.filter((c) => c.consumer_id === this.opeyConsumerId);
				logger.info(`checkExistingOpeyConsent: Found ${opeyConsents.length} Opey consents:`);

				opeyConsents.forEach((consent, index) => {
					try {
						const jwtStatus = this.isConsentExpired(consent) ? 'EXPIRED' : 'VALID';
						logger.info(
							`  ${index + 1}. ID: ${consent.consent_id}, Status: ${consent.status}, JWT: ${jwtStatus}`
						);
						if (consent.jwt_payload?.exp) {
							const expDate = new Date(consent.jwt_payload.exp * 1000);
							const now = new Date();
							logger.info(
								`     JWT expires: ${expDate.toISOString()} (${expDate > now ? 'future' : 'past'})`
							);
						}
					} catch (consentError) {
						logger.error(`Error analyzing consent ${consent.consent_id}:`, consentError);
					}
				});
			} catch (filterError) {
				logger.error('Error filtering Opey consents:', filterError);
			}

			logger.info('checkExistingOpeyConsent: Starting consent loop...');
			for (const consent of consents) {
				try {
					logger.debug(
						`checkExistingOpeyConsent: Checking consent ${consent.consent_id} - consumer_id: ${consent.consumer_id}, status: ${consent.status}`
					);

					if (consent.consumer_id === this.opeyConsumerId) {
						logger.info(`checkExistingOpeyConsent: Found Opey consent ${consent.consent_id}:`);
						logger.info(`  Status: ${consent.status}`);

						let isExpired = false;
						try {
							isExpired = this.isConsentExpired(consent);
							logger.info(`  JWT expired: ${isExpired}`);
						} catch (expiredError) {
							logger.error(`Error checking if consent is expired:`, expiredError);
							isExpired = true; // Assume expired if we can't check
						}

						if (consent.status === 'ACCEPTED' && !isExpired) {
							logger.info(`checkExistingOpeyConsent: ✅ This consent is valid! Using it.`);

							try {
								// Retrieve the actual consent with JWT
								logger.info(`checkExistingOpeyConsent: Fetching full consent details...`);
								const consentWithJwt = await obp_requests.get(
									`/obp/v5.1.0/user/current/consents/${consent.consent_id}`,
									session.data.oauth.access_token
								);

								logger.info(
									`checkExistingOpeyConsent: Got consent with JWT, extracting username...`
								);
								const userIdentifier = extractUsernameFromJWT(consentWithJwt.jwt);
								logger.info(
									`checkExistingOpeyConsent says: ✅ Retrieved existing consent JWT - Primary user: ${userIdentifier}`
								);
								logger.info(
									`checkExistingOpeyConsent: JWT length: ${consentWithJwt.jwt.length} characters`
								);

								return consentWithJwt.jwt;
							} catch (jwtError) {
								logger.error(`Error retrieving consent JWT for ${consent.consent_id}:`, jwtError);
							}
						} else {
							logger.warn(
								`checkExistingOpeyConsent: ❌ Opey consent ${consent.consent_id} not usable - status: ${consent.status}, expired: ${isExpired}`
							);
						}
					}
				} catch (consentLoopError) {
					logger.error(`Error processing consent ${consent.consent_id}:`, consentLoopError);
				}
			}
			logger.info('checkExistingOpeyConsent: Finished consent loop');

			logger.warn(`checkExistingOpeyConsent: ❌ No valid Opey consent found`);
			return null;
		} catch (error) {
			logger.error('checkExistingOpeyConsent says: Consent check failed:', error);
			logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
			return null;
		}
	}

	private async createImplicitConsent(accessToken: string): Promise<OBPConsent> {
		const now = new Date().toISOString().split('.')[0] + 'Z';

		const body = {
			everything: true,
			entitlements: [],
			consumer_id: this.opeyConsumerId,
			views: [],
			valid_from: now,
			time_to_live: 3600
		};

		const consent = await obp_requests.post('/obp/v5.1.0/my/consents/IMPLICIT', body, accessToken);
		const userIdentifier = extractUsernameFromJWT(consent.jwt);
		logger.info(
			`createImplicitConsent says: Created implicit consent - Primary user: ${userIdentifier}`
		);
		return consent;
	}

	private isConsentExpired(consent: any): boolean {
		const exp = consent.jwt_payload?.exp;
		if (!exp) return true;
		const now = Math.floor(Date.now() / 1000);
		return exp < now;
	}

	/**
	 * Get detailed consent status including JWT validity
	 */
	public getConsentStatus(consent: any): {
		status: 'valid' | 'expired' | 'invalid' | 'no_jwt';
		message: string;
		expiresAt?: Date;
		isOpeyConsent?: boolean;
	} {
		const isOpeyConsent = consent.consumer_id === this.opeyConsumerId;

		if (!consent.jwt_payload?.exp) {
			return {
				status: 'no_jwt',
				message: 'No JWT expiration information available',
				isOpeyConsent
			};
		}

		const exp = consent.jwt_payload.exp;
		const now = Math.floor(Date.now() / 1000);
		const expiresAt = new Date(exp * 1000);

		if (exp < now) {
			const expiredAgo = Math.floor((now - exp) / 60); // minutes ago
			return {
				status: 'expired',
				message: `JWT expired ${expiredAgo} minutes ago`,
				expiresAt,
				isOpeyConsent
			};
		}

		const expiresIn = Math.floor((exp - now) / 60); // minutes until expiration
		return {
			status: 'valid',
			message: `JWT valid, expires in ${expiresIn} minutes`,
			expiresAt,
			isOpeyConsent
		};
	}

	/**
	 * Validate if a consent JWT is still valid by testing with Opey
	 */
	public async validateConsentJWT(consentJwt: string): Promise<{
		valid: boolean;
		error?: string;
	}> {
		try {
			const opeyResponse = await fetch(`${env.OPEY_BASE_URL}/create-session`, {
				method: 'POST',
				headers: {
					'Consent-JWT': consentJwt,
					'Content-Type': 'application/json'
				}
			});

			if (opeyResponse.ok) {
				return { valid: true };
			} else {
				const errorText = await opeyResponse.text();
				return {
					valid: false,
					error: errorText.includes('Invalid Consent-JWT')
						? 'JWT rejected by Opey (invalid/expired)'
						: `Opey error: ${errorText}`
				};
			}
		} catch (error) {
			return {
				valid: false,
				error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}
}
