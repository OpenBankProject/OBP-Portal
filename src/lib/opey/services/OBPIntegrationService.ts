import type { Session } from 'svelte-kit-sessions';
import { obp_requests } from '$lib/obp/requests';
import type { OBPConsent } from '$lib/obp/types';

export interface OBPIntegrationService {
  getOrCreateOpeyConsent(session: Session): Promise<string>;
  checkExistingOpeyConsent(session: Session): Promise<string | null>;
}

export class DefaultOBPIntegrationService implements OBPIntegrationService {
  constructor(private opeyConsumerId: string) {}

  async getOrCreateOpeyConsent(session: Session): Promise<string> {
    if (!session.data.oauth?.access_token) {
      throw new Error('User not authenticated with OBP');
    }

    // Check for existing consent first
    const existingConsentId = await this.checkExistingOpeyConsent(session);
    if (existingConsentId) {
      return existingConsentId;
    }

    // Create new consent
    const consent = await this.createImplicitConsent(session.data.oauth.access_token);
    return consent.jwt;
  }

  async checkExistingOpeyConsent(session: Session): Promise<string | null> {
    if (!session.data.oauth?.access_token) {
      return null;
    }

    try {
      const response = await obp_requests.get('/obp/v5.1.0/my/consents', session.data.oauth.access_token);
      const consents = response.consents || [];

      for (const consent of consents) {
        if (consent.consumer_id === this.opeyConsumerId && 
            consent.status === 'ACCEPTED' && 
            !this.isConsentExpired(consent)) {
          // Return the JWT, not just the consent_id
          const fullConsent = await obp_requests.get(
            `/obp/v5.1.0/user/current/consents/${consent.consent_id}`, 
            session.data.oauth.access_token
          );
          return fullConsent.jwt;
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking existing consent:', error);
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
      time_to_live: 3600,
    };

    return await obp_requests.post('/obp/v5.1.0/my/consents/IMPLICIT', accessToken, body);
  }

  private isConsentExpired(consent: any): boolean {
    const exp = consent.jwt_payload?.exp;
    if (!exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return exp < now;
  }
}