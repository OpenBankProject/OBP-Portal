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
        const message = this.messages.find(msg => msg.id === messageId);
        if (message) {
            if (message.isStreaming === undefined) {
                logger.debug(`Message with ID ${messageId} does not have isStreaming property.`);
            } else if (!message.isStreaming) {
                logger.debug(`Message with ID ${messageId} is already marked as complete.`);
            } else {
                logger.debug(`Marking message with ID ${messageId} as complete.`);
                message.isStreaming = false; // Mark the message as complete
                this.emit(); // Notify subscribers about the change
            }
        } else {
            // Check if this is a stale message from a previous session
            if (this.isStaleMessage(messageId)) {
                logger.debug(`Ignoring stale completion for message ${messageId} from previous session.`);
                return;
            }
            // Reduce noise - only log if we're actually tracking messages
            if (this.messages.length > 0) {
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
        const toolMessage = this.messages.find(msg => msg.role === 'tool' && msg.id === toolCallId) as ToolMessage | undefined;
        if (toolMessage) {
            Object.assign(toolMessage, updates); // Update the tool message with the provided fields
            this.emit(); // Notify subscribers about the change
        } else {
            // Reduce noise - only log if we're actually tracking messages
            if (this.messages.length > 0) {
                logger.debug(`Tool message with ID ${toolCallId} not found for update operation.`);
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