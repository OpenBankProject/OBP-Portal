import { createLogger } from '$lib/utils/logger';
const logger = createLogger('ConsentSessionService');
import { extractUsernameFromJWT } from '$lib/utils/jwt';
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
            const userIdentifier = extractUsernameFromJWT(consentJwt);
            logger.info(`createSession says: Creating session with consent JWT and sending to Opey - Primary user: ${userIdentifier}`);
            headers['Consent-Id'] = consentJwt
        } else {
            logger.info("createSession says: Creating anonymous session - no consent JWT");
            // No Consent-JWT header means anonymous session
        }
        const res = await fetch(`${this.baseUrl}/create-session`, {
            method: 'POST',
            headers,
            credentials: 'include',
        })

        if (!res.ok) {
            const errorText = await res.text();
            logger.error(`createSession says: Failed to create session: ${errorText}`);
            throw new Error(`Failed to create session: ${errorText}`);
        } else {
            if (consentJwt) {
                const userIdentifier = extractUsernameFromJWT(consentJwt);
                logger.info(`createSession says: Opey session created successfully - Primary user: ${userIdentifier}`);
            } else {
                logger.info("createSession says: Anonymous Opey session created successfully");
            }
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