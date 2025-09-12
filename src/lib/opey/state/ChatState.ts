import { createLogger } from '$lib/utils/logger';
const logger = createLogger('ChatState');
import { v4 as uuidv4 } from 'uuid';
import type { BaseMessage, ToolMessage, ApprovalRequestMessage } from '../types';

export interface ChatStateSnapshot {
	threadId: string;
	messages: BaseMessage[];
}

export class ChatState {
	private threadId: string;
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
		this.messages = [];
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
		if (this.messages.some((existing) => existing.id === message.id)) {
			logger.warn(`Duplicate message ID detected: ${message.id}. Skipping duplicate message.`);
			return;
		}
		this.messages.push(message);
		this.emit();
	}

	addToolMessage(toolMessage: ToolMessage): void {
		// Check for duplicate IDs
		if (this.messages.some((existing) => existing.id === toolMessage.id)) {
			logger.warn(
				`Duplicate tool message ID detected: ${toolMessage.id}. Skipping duplicate message.`
			);
			return;
		}
		this.messages.push(toolMessage);
		this.emit();
	}

	// Helper to find a tool message by its toolCallId
    getToolMessageByCallId(toolCallId: string): ToolMessage | undefined {
        return this.messages.find(
            (msg) => msg.role === 'tool' && (msg as ToolMessage).toolCallId === toolCallId
        ) as ToolMessage | undefined;
    }
    
    // Modify this to not update based on approval
    addApprovalRequest(
        toolCallId: string,
        toolName: string,
        toolInput: Record<string, any>,
        description?: string
    ): void {
        // Find corresponding tool message and set waitingForApproval=true
        const toolMessage = this.getToolMessageByCallId(toolCallId);
        
        if (toolMessage) {
            toolMessage.waitingForApproval = true;
            toolMessage.approvalStatus = undefined; // Reset if previously set
        } else {
            logger.warn(`No tool message found for approval request: ${toolCallId}`);
            // Create a new tool message if one doesn't exist
            this.addToolMessage({
                id: toolCallId,
                role: 'tool',
                message: '',
                timestamp: new Date(),
                toolCallId: toolCallId,
                toolName: toolName,
                toolInput: toolInput,
                isStreaming: false,
                waitingForApproval: true,
                description
            } as ToolMessage);
        }
        
        this.messages = [...this.messages]; // Force Svelte reactivity
        this.emit();
    }
    
    // Update to set approval status and force update
    updateApprovalRequest(toolCallId: string, approved: boolean): void {
        // Update the tool message with approval status
        const toolMessage = this.getToolMessageByCallId(toolCallId);
        
        if (toolMessage) {
            toolMessage.approvalStatus = approved ? 'approved' : 'denied';
            // Don't set waitingForApproval=false yet - that happens when the tool_start event comes
        }
        
        this.messages = [...this.messages]; // Force Svelte reactivity
        this.emit();
    }
    
    // Update this to properly update the tool message on tool_start
    removeApprovalRequest(toolCallId: string): void {
        const toolMessage = this.getToolMessageByCallId(toolCallId);
        
        if (toolMessage) {
            toolMessage.waitingForApproval = false;
            // Don't reset approvalStatus - keep 'approved' or 'denied' status
            
            // Important: If tool was approved, ensure it's now marked as streaming
            if (toolMessage.approvalStatus === 'approved') {
                toolMessage.isStreaming = true;
            }
        }
        
        this.messages = [...this.messages]; // Force Svelte reactivity
        this.emit();
    }

	appendToMessage(messageId: string, text: string): void {
		const message = this.messages.find((msg) => msg.id === messageId);
		if (message) {
			message.message += text; // Append text to the existing message
			this.messages = [...this.messages]; // Force Svelte reactivity
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
		const message = this.messages.find((msg) => msg.id === messageId);
		if (!message) {
			// Check if this is a stale message from a previous session
			if (this.isStaleMessage(messageId)) {
				logger.debug(`Ignoring stale completion for message ${messageId}`);
				return;
			}
			// Only log if we're actually tracking messages
			if (this.messages.length > 0) {
				logger.debug(`Message ${messageId} not found for completion`);
			}
			return;
		}

		if (message.isStreaming === undefined) {
			logger.debug(`Message ${messageId} does not have isStreaming property`);
			return;
		}

		if (!message.isStreaming) {
			logger.debug(`Message ${messageId} is already marked as complete`);
			return;
		}

		// Mark the message as complete
		message.isStreaming = false;
		this.messages = [...this.messages]; // Force Svelte reactivity
		this.emit(); // Notify subscribers about the change
		logger.debug(`Marked message ${messageId} as complete`);
	}

	updateMessage(messageId: string, updates: Partial<BaseMessage>): void {
		const message = this.messages.find((msg) => msg.id === messageId);
		if (message) {
			Object.assign(message, updates); // Update the message with the provided fields
			this.messages = [...this.messages]; // Force Svelte reactivity
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
		const toolMessages = this.messages.filter((msg) => msg.role === 'tool');
		console.error(`CHATSTATE_DEBUG: Found ${toolMessages.length} tool messages`);
		toolMessages.forEach((msg, index) => {
			console.error(
				`CHATSTATE_DEBUG: Tool message ${index}: id="${msg.id}", toolCallId="${(msg as ToolMessage).toolCallId}"`
			);
		});

		const toolMessage = this.messages.find(
			(msg) => msg.role === 'tool' && msg.id === toolCallId
		) as ToolMessage | undefined;
		if (toolMessage) {
			console.error(`CHATSTATE_DEBUG: Found matching tool message, updating with:`, updates);
			Object.assign(toolMessage, updates); // Update the tool message with the provided fields
			this.messages = [...this.messages]; // Force Svelte reactivity
			this.emit(); // Notify subscribers about the change
			console.error(`CHATSTATE_DEBUG: Tool message updated and state emitted`);
		} else {
			console.error(`CHATSTATE_DEBUG: NO MATCH - Tool message with ID ${toolCallId} not found`);
			// Try to find by toolCallId instead of id
			const toolMessageByCallId = this.messages.find(
				(msg) => msg.role === 'tool' && (msg as ToolMessage).toolCallId === toolCallId
			) as ToolMessage | undefined;
			if (toolMessageByCallId) {
				console.error(
					`CHATSTATE_DEBUG: Found tool message by toolCallId instead of id, updating...`
				);
				Object.assign(toolMessageByCallId, updates);
				this.messages = [...this.messages]; // Force Svelte reactivity
				this.emit();
				console.error(`CHATSTATE_DEBUG: Tool message updated via toolCallId match`);
			} else {
				console.error(`CHATSTATE_DEBUG: No tool message found by either id or toolCallId`);
			}
		}
	}

	subscribe(fn: (msgs: ChatStateSnapshot) => void): void {
		this.subscribers.push(fn);
		logger.debug('ChatState: Subscribed to messages');
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
		};
		this.subscribers.forEach((fn) => fn(snapshot));
	}
}
