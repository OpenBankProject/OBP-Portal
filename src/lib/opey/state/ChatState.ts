import { v4 as uuidv4 } from 'uuid';
import type { BaseMessage } from "../types";

export interface ChatStateSnapshot {
    threadId: string
    messages: BaseMessage[]
}

export class ChatState {
    private threadId: string
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

    appendToMessage(messageId: string, text: string): void {
        const message = this.messages.find(msg => msg.id === messageId);
        if (message) {
            message.message += text; // Append text to the existing message
            this.emit(); // Notify subscribers about the change
        } else {
            console.warn(`Message with ID ${messageId} not found.`);
        }
    }

    markMessageComplete(messageId: string): void {
        const message = this.messages.find(msg => msg.id === messageId);
        if (message) {
            if (message.isStreaming === undefined) {
                console.warn(`Message with ID ${messageId} does not have isStreaming property.`);
            } else if (message.isStreaming === false) {
                console.debug(`Message with ID ${messageId} is already marked as complete.`);
            } else {
                message.isStreaming = false; // Mark the message as complete
                this.emit(); // Notify subscribers about the change
            }
        } else {
            console.warn(`Message with ID ${messageId} not found.`);
        }
    }

    updateMessage(messageId: string, updates: Partial<BaseMessage>): void {
        const message = this.messages.find(msg => msg.id === messageId);
        if (message) {
            Object.assign(message, updates); // Update the message with the provided fields
            this.emit(); // Notify subscribers about the change
        } else {
            console.warn(`Message with ID ${messageId} not found.`);
        }
    }

    subscribe(fn: (msgs: ChatStateSnapshot) => void): void {
        this.subscribers.push(fn);
        console.debug("ChatState: Subscribed to messages");
        fn({ threadId: this.threadId, messages: this.messages }); // Send current state immediately
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