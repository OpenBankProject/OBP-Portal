import type { ChatService, StreamEvent } from "./ChatService";
import { CookieAuthStrategy, type AuthStrategy } from "./AuthStrategy";
import type { UserMessage, AssistantMessage, ToolMessage } from "../types";

export class RestChatService implements ChatService {
    private assistantCallback?: (msg: AssistantMessage) => void;
    private toolCallback?: (msg: ToolMessage) => void;
    private errorCallback?: (err: Error) => void;
    private streamEventCallback?: (event: StreamEvent) => void;

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
            if (res.status === 422) {
                const errorData = await res.json();
                console.log("Validation error response:", errorData);
                console.error(`Validation error: ${errorData.detail[0].msg} {${errorData.detail[0].field}}`);
            }
            // System-level error - use onError callback
            const error = new Error(`Failed to send message: ${res.statusText}`);
            this.errorCallback?.(error);
            return;
        }

        const reader = res.body?.getReader();
        if (!reader)
    }

    onAssistantMessage(fn: (msg: AssistantMessage) => void) { 
        // Register the callback to handle assistant messages
        this.assistantCallback = fn
    }

    onStreamEvent(fn: (event: StreamEvent) => void) {
        this.streamEventCallback = fn
        // Register the callback to handle streaming events
    }

    onToolMessage(fn: (msg: ToolMessage) => void) {
        this.toolCallback = fn
        // Register the callback to handle tool messages
    }

    onError(fn: (err: Error) => void) {
        this.errorCallback = fn
        // Register the callback to handle errors
    }
    cancel() { /* abort controller */ }
}