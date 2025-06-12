export interface SessionService {
    createSession(consentJwt?: string): Promise<void>;

    deleteSession(): Promise<void>;

    getStatus(): Promise<{status: string}>;
}