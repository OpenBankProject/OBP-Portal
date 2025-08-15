import { createLogger } from '$lib/utils/logger';
const logger = createLogger('ChatState');
import { v4 as uuidv4 } from 'uuid';
import type { BaseMessage, ToolMessage, ApprovalRequestMessage} from "../types";

export interface ChatStateSnapshot {
    threadId: string
    messages: BaseMessage[]
}

export class ChatState {
    private threadId: string
    private messages: BaseMessage[] = [];
    private subscribers: Array<(snapshot: ChatStateSnapshot) => void> = [];
    private sessionStartTime: Date = new Date();

    constructor(threadId?: string) {
        this.threadId = threadId || uuidv4(); // Generate a new thread ID if not provided
        this.sessionStartTime = new Date();
    }

    /** returns the current thread ID */
    getThreadId(): string {
        return this.threadId;
    }

    /** resets to a new thread (e.g. "New Chat" button) */
    setThreadId(newId: string = uuidv4()): void {
        this.threadId = newId;
        this.messages = []
        this.sessionStartTime = new Date();
        this.emit(); // Notify subscribers about the change
    }

    /** synchronizes thread_id with backend without clearing messages */
    syncThreadId(backendThreadId: string): void {
        if (this.threadId !== backendThreadId) {
            logger.debug(`Syncing thread_id: ${this.threadId} -> ${backendThreadId}`);
            this.threadId = backendThreadId;
            this.emit(); // Notify subscribers about the change
        }
    }

    addMessage(message: BaseMessage): void {
        // Check for duplicate IDs
        if (this.messages.some(existing => existing.id === message.id)) {
            logger.warn(`Duplicate message ID detected: ${message.id}. Skipping duplicate message.`);
            return;
        }
        this.messages.push(message)
        this.emit()
    }

    addToolMessage(toolMessage: ToolMessage): void {
        // Check for duplicate IDs
        if (this.messages.some(existing => existing.id === toolMessage.id)) {
            logger.warn(`Duplicate tool message ID detected: ${toolMessage.id}. Skipping duplicate message.`);
            return;
        }
        this.messages.push(toolMessage);
        this.emit();
    }

    addApprovalRequest(toolCallId: string, toolName: string, toolInput: Record<string, any>, description?: string): void {
        const approvalId = `approval_${toolCallId}`;
        
        // Check for duplicate IDs
        if (this.messages.some(existing => existing.id === approvalId)) {
            logger.warn(`Duplicate approval request ID detected: ${approvalId}. Skipping duplicate request.`);
            return;
        }
        
        const approvalMessage: ApprovalRequestMessage = {
            id: approvalId,
            role: 'approval_request',
            message: `Approval required for ${toolName}`,
            timestamp: new Date(),
            toolCallId,
            toolName,
            toolInput,
            description
        };
        this.messages.push(approvalMessage);
        this.emit();
    }

    updateApprovalRequest(toolCallId: string, approved: boolean): void {
        const message = this.messages.find(msg => msg.role === 'approval_request' && (msg as ApprovalRequestMessage).toolCallId === toolCallId) as ApprovalRequestMessage | undefined;
        if (message) {
            message.approved = approved;
            this.emit();
        } else {
            logger.debug(`Approval request with ID ${toolCallId} not found for update.`);
        }
    }

    removeApprovalRequest(toolCallId: string): void {
        const initialLength = this.messages.length;
        this.messages = this.messages.filter(msg => !(msg.role === 'approval_request' && (msg as ApprovalRequestMessage).toolCallId === toolCallId));
        if (this.messages.length !== initialLength) {
            logger.debug(`Removed approval request for tool call ID: ${toolCallId}`);
            this.emit();
        }
    }

    appendToMessage(messageId: string, text: string): void {
        const message = this.messages.find(msg => msg.id === messageId);
        if (message) {
            message.message += text; // Append text to the existing message
            this.emit(); // Notify subscribers about the change
        } else {
            // Check if this is a stale message from a previous session
            if (this.isStaleMessage(messageId)) {
                logger.debug(`Ignoring stale message ${messageId} from previous session.`);
                return;
            }
            // Reduce noise - only log if we're actually tracking messages
            if (this.messages.length > 0) {
                logger.debug(`Message with ID ${messageId} not found for append operation.`);
            }
        }
    }

    markMessageComplete(messageId: string): void {
        console.error(`CHATSTATE_DEBUG: markMessageComplete called for messageId: ${messageId}`);
        const message = this.messages.find(msg => msg.id === messageId);
        if (message) {
            console.error(`CHATSTATE_DEBUG: Found message for completion, role: ${message.role}, isStreaming: ${message.isStreaming}`);
            if (message.isStreaming === undefined) {
                console.error(`CHATSTATE_DEBUG: Message ${messageId} does not have isStreaming property`);
                logger.debug(`Message with ID ${messageId} does not have isStreaming property.`);
            } else if (!message.isStreaming) {
                console.error(`CHATSTATE_DEBUG: Message ${messageId} is already marked as complete`);
                logger.debug(`Message with ID ${messageId} is already marked as complete.`);
            } else {
                console.error(`CHATSTATE_DEBUG: Marking message ${messageId} as complete (stopping spinner)`);
                logger.debug(`Marking message with ID ${messageId} as complete.`);
                message.isStreaming = false; // Mark the message as complete
                this.emit(); // Notify subscribers about the change
                console.error(`CHATSTATE_DEBUG: Message marked complete and state emitted`);
            }
        } else {
            console.error(`CHATSTATE_DEBUG: Message ${messageId} NOT FOUND for completion`);
            // Check if this is a stale message from a previous session
            if (this.isStaleMessage(messageId)) {
                console.error(`CHATSTATE_DEBUG: Ignoring stale completion for message ${messageId}`);
                logger.debug(`Ignoring stale completion for message ${messageId} from previous session.`);
                return;
            }
            // Reduce noise - only log if we're actually tracking messages
            if (this.messages.length > 0) {
                console.error(`CHATSTATE_DEBUG: Message ${messageId} not found in ${this.messages.length} messages`);
                logger.debug(`Message with ID ${messageId} not found for completion.`);
            }
        }
    }

    updateMessage(messageId: string, updates: Partial<BaseMessage>): void {
        const message = this.messages.find(msg => msg.id === messageId);
        if (message) {
            Object.assign(message, updates); // Update the message with the provided fields
            this.emit(); // Notify subscribers about the change
        } else {
            // Reduce noise - only log if we're actually tracking messages
            if (this.messages.length > 0) {
                logger.debug(`Message with ID ${messageId} not found for update operation.`);
            }
        }
    }

    updateToolMessage(toolCallId: string, updates: Partial<ToolMessage>): void {
        console.error(`CHATSTATE_DEBUG: Looking for tool message with ID: ${toolCallId}`);
        console.error(`CHATSTATE_DEBUG: Total messages in state: ${this.messages.length}`);
        
        // Debug all tool messages in the state
        const toolMessages = this.messages.filter(msg => msg.role === 'tool');
        console.error(`CHATSTATE_DEBUG: Found ${toolMessages.length} tool messages`);
        toolMessages.forEach((msg, index) => {
            console.error(`CHATSTATE_DEBUG: Tool message ${index}: id="${msg.id}", toolCallId="${(msg as ToolMessage).toolCallId}"`);
        });
        
        const toolMessage = this.messages.find(msg => msg.role === 'tool' && msg.id === toolCallId) as ToolMessage | undefined;
        if (toolMessage) {
            console.error(`CHATSTATE_DEBUG: Found matching tool message, updating with:`, updates);
            Object.assign(toolMessage, updates); // Update the tool message with the provided fields
            this.emit(); // Notify subscribers about the change
            console.error(`CHATSTATE_DEBUG: Tool message updated and state emitted`);
        } else {
            console.error(`CHATSTATE_DEBUG: NO MATCH - Tool message with ID ${toolCallId} not found`);
            // Try to find by toolCallId instead of id
            const toolMessageByCallId = this.messages.find(msg => msg.role === 'tool' && (msg as ToolMessage).toolCallId === toolCallId) as ToolMessage | undefined;
            if (toolMessageByCallId) {
                console.error(`CHATSTATE_DEBUG: Found tool message by toolCallId instead of id, updating...`);
                Object.assign(toolMessageByCallId, updates);
                this.emit();
                console.error(`CHATSTATE_DEBUG: Tool message updated via toolCallId match`);
            } else {
                console.error(`CHATSTATE_DEBUG: No tool message found by either id or toolCallId`);
            }
        }
    }

    subscribe(fn: (msgs: ChatStateSnapshot) => void): void {
        this.subscribers.push(fn);
        logger.debug("ChatState: Subscribed to messages");
        fn({ threadId: this.threadId, messages: this.messages }); // Send current state immediately
    }

    clear(): void {
        this.messages = [];
        this.sessionStartTime = new Date();
        this.emit();
    }

    private isStaleMessage(messageId: string): boolean {
        // Consider messages with run- prefix as potentially stale if session was reset recently
        if (messageId.startsWith('run-')) {
            const timeSinceReset = Date.now() - this.sessionStartTime.getTime();
            // If session was reset within last 5 seconds, consider run- messages as stale
            return timeSinceReset < 5000;
        }
        return false;
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