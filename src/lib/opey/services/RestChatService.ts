import type { ChatService } from "./ChatService";
import { CookieAuthStrategy, type AuthStrategy } from "./AuthStrategy";
import type { UserMessage, AssistantMessage, ToolMessage } from "../types";

export class RestChatService implements ChatService {
    constructor(
        private baseUrl: string,
        private auth: AuthStrategy = new CookieAuthStrategy()
    ) { }

    private async buildInit(init: RequestInit = {}): Promise<RequestInit> {
        const headers = { ...(init.headers || {}), ...(await this.auth.getHeaders()) }
        return { ...init, headers, credentials: "include" }
    }

    async send(msg: UserMessage): Promise<void> {
        const init = await this.buildInit({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(msg),
        })
        const res = await fetch(`${this.baseUrl}/stream`, init)
        // … stream parsing, emit tool/assistant events …

        if (!res.ok) {
            throw new Error(`Failed to send message: ${res.statusText}`);
        }
    }

    onAssistantMessage(fn: (msg: AssistantMessage) => void) { /* subscribe SSE or WebSocket */ }
    onToolMessage(fn: (msg: ToolMessage) => void) { /* idem */ }
    onError(fn: (err: Error) => void) { /* idem */ }
    cancel() { /* abort controller */ }
}