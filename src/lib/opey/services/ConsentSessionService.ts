import { createLogger } from '$lib/utils/logger';
const logger = createLogger('ConsentSessionService');
import type { SessionService } from "./SessionService";

/**
 * Service for managing consent based sessions at OBP using REST endpoints
 */
export class ConsentSessionService implements SessionService {
    constructor(private baseUrl: string) { }

    // Allows posting without a consent JWT, i.e. anonyous session for the portal homepage
    // These should be rate-limited somehow, i guess on Opey's side
    async createSession(consentJwt?: string) {
        const headers: Record<string, string> = {};
        if (consentJwt) {
            logger.info("Creating session with consent JWT");
            headers['Consent-JWT'] = consentJwt
        } else {
            logger.info("Creating anonymous session");
            // No Consent-JWT header means anonymous session
        }
        const res = await fetch(`${this.baseUrl}/create-session`, {
            method: 'POST',
            headers,
            credentials: 'include',
        })

        if (!res.ok) {
            throw new Error(`Failed to create session: ${await res.text()}`);
        } else {
            logger.info("Session created successfully");
        }
    }

    async deleteSession(): Promise<void> {
        const res = await fetch(`${this.baseUrl}/delete-session`, {
            method: 'POST',
            credentials: 'include'
        });
        if (!res.ok) {
            throw new Error(`Session deletion failed: ${res.statusText}`);
        }
    }

    async getStatus(): Promise<{ status: string }> {
        const res = await fetch(`${this.baseUrl}/status`, {
            method: 'GET',
            credentials: 'include'
        });
        if (!res.ok) {
            throw new Error(`Failed to get session status: ${res.statusText}`);
        }
        return await res.json();
    }
}