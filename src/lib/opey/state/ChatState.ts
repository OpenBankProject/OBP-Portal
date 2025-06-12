import { v4 as uuidv4 } from 'uuid';
import type { BaseMessage } from "../types";

export interface ChatStateSnapshot {
    threadId: string
    messages: BaseMessage[]
}

export class ChatState {
    private threadId: string // Optional thread ID if needed
    private messages: BaseMessage[] = [];
    private subscribers: Array<(snapshot: ChatStateSnapshot) => void> = [];

    constructor(threadId?: string) {
        this.threadId = threadId || uuidv4(); // Generate a new thread ID if not provided
    }

    /** returns the current thread ID */
    getThreadId(): string {
        return this.threadId;
    }

    /** resets to a new thread (e.g. “New Chat” button) */
    setThreadId(newId: string = uuidv4()): void {
        this.threadId = newId;
        this.messages = []
        this.emit(); // Notify subscribers about the change
    }
    
    addMessage(message: BaseMessage): void {
        this.messages.push(message)
        this.emit()
    }

    subscribe(fn: (msgs: ChatStateSnapshot) => void): void {
        this.subscribers.push(fn);
        fn({threadId: this.threadId, messages: this.messages }); // Send current state immediately
    }

    clear(): void {
        this.messages = [];
        this.emit();
    }

    // Notify subscribers
    private emit(): void {
        const snapshot = {
            threadId: this.threadId,
            messages: this.messages
        }
        this.subscribers.forEach(fn => fn(snapshot))
    }
}