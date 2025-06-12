import type { BaseMessage } from "../types";

export class ChatState {
    private threadId: string | null = null; // Optional thread ID if needed
    private messages: BaseMessage[] = [];
    private subscribers: Array<(messages: BaseMessage[]) => void> = [];

    addMessage(message: BaseMessage): void {
        this.messages.push(message)
        this.emit()
    }

    subscribe(fn: (msgs: BaseMessage[]) => void): void {
        this.subscribers.push(fn);
        fn(this.messages); // Send current state immediately
    }

    // Notify subscribers
    private emit(): void {
        this.subscribers.forEach(fn => fn(this.messages))
    }

    clear(): void {
        this.messages = [];
        this.emit();
    }
}