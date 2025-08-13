import { createLogger } from '$lib/utils/logger';
const logger = createLogger('SessionController');
import type { SessionService } from "../services/SessionService";
import type { SessionState } from "../state/SessionState";

export class SessionController {
    constructor(
        private service: SessionService,
        public sessionState: SessionState
    ) { }

    async init(consentJwt?: string): Promise<void> {
        try {
            this.sessionState.setStatus('loading')
            await this.service.createSession(consentJwt);
            // Sets the auth status to true if a consent is provided
            // Else we assume an anonymous session
            this.sessionState.setAuth(!!consentJwt)
            this.sessionState.setStatus('ready')
        } catch (error: any) {
            logger.error("init error:", error)
            this.sessionState.setStatus('error', error.message)
        }
    }

    async destroy(): Promise<void> {
        this.sessionState.setStatus('loading')
        await this.service.deleteSession()
        this.sessionState.setAuth(false)
        this.sessionState.setStatus('ready')
    }
}