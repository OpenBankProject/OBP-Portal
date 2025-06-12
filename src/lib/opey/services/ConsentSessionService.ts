import type { SessionService } from "./SessionService";

/**
 * Service for managing consent based sessions at OBP using REST endpoints
 */
export class ConsentSessionService implements SessionService {
    constructor(private baseUrl: string) { }

    async createSession(consentJwt?: string) {
        const headers: Record<string, string> = {};
        if (consentJwt) headers['Consent-JWT'] = consentJwt;
        const res = await fetch(`${this.baseUrl}/consent-session`, {
            method: 'POST',
            headers,
            credentials: 'include',
        })
        if (!res.ok) {
            throw new Error(`Failed to create session: ${res.statusText}`);
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