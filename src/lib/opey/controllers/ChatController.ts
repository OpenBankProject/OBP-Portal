import { createLogger } from '$lib/utils/logger';
const logger = createLogger('ChatController');
import { v4 as uuidv4 } from 'uuid';
import type { ChatService, StreamEvent } from '../services/ChatService';
import type { ToolMessage, UserMessage } from '../types';
import { ChatState } from '../state/ChatState';

export class ChatController {
	private toolInstanceCounts: Record<string, number> = {};

	constructor(
		private service: ChatService,
		public state: ChatState
	) {

		service.onStreamEvent((event: StreamEvent) => {
			logger.error('STREAM EVENT RECEIVED:', event.type);
    		console.error('STREAM EVENT RECEIVED:', event.type);
    
			try {
				switch (event.type) {
					case 'thread_sync':
						logger.debug(`Syncing thread_id with backend: ${event.threadId}`);
						state.syncThreadId(event.threadId);
						break;
					case 'assistant_start':
						state.addMessage({
							id: event.messageId,
							role: 'assistant',
							message: '',
							timestamp: event.timestamp,
							isStreaming: true
						});
						break;
					case 'assistant_token':

						state.appendToMessage(event.messageId, event.token);
						break;
					case 'assistant_complete':
						logger.debug('Marking assistant message as complete:', event);
						state.markMessageComplete(event.messageId);
						break;
					case 'tool_start':
						// Remove the approval request message now that the tool is starting
						state.removeApprovalRequest(event.toolCallId);

						// Assign instance number for this tool type
						const instanceNumber = this.assignToolInstance(event.toolName);

						state.addToolMessage({
							id: event.toolCallId,
							role: 'tool',
							message: '',
							timestamp: new Date(),
							toolCallId: event.toolCallId,
							toolName: event.toolName,
							toolInput: event.toolInput,
							isStreaming: true,
							instanceNumber: instanceNumber
						} as ToolMessage); // Cast to ToolMessage for type safety
						break;
					case 'tool_token':
						// We currently dont stream tool ouput, but keep for future compatibility
						// No action needed for tool token in this implementation
						break;
					case 'tool_complete':
						// Debug logging for tool completion
						logger.debug(`Received tool_complete event for ${event.toolCallId}`);
						logger.debug(
							`Tool output: ${JSON.stringify(event.toolOutput)?.substring(0, 200)}...`
						);
						logger.debug(`Tool status: ${event.status}`);

						// Update the toolMessage with the output and status
						const updates: Partial<ToolMessage> = {
							toolOutput: event.toolOutput,
							status: event.status
						};

						// If the tool failed, also set error message from output if available
						if (event.status === 'error' && event.toolOutput) {
							const errorOutput =
								typeof event.toolOutput === 'string'
									? event.toolOutput
									: JSON.stringify(event.toolOutput);
							updates.error = `Tool execution failed: ${errorOutput}`;
						}

						state.updateToolMessage(event.toolCallId, updates);
						state.markMessageComplete(event.toolCallId);
						logger.debug(
							`FRONTEND_DEBUG: Tool message updated and marked complete for ${event.toolCallId}`
						);
						break;
					case 'error':
						if (event.messageId) {
							state.updateMessage(event.messageId, { error: event.error });
						} else {
							// System error - add new error message
							state.addMessage({
								id: uuidv4(),
								role: 'error',
								message: '',
								timestamp: new Date(),
								error: event.error
							});
						}
						break;
					case 'approval_request':
						state.addApprovalRequest(
							event.toolCallId,
							event.toolName,
							event.toolInput,
							event.description
						);
						break;
				}
			} catch (error) {
				logger.error('Error processing stream event:', error, event);
			}
		});

		// // EXISTING: Fallback for non-streaming services
		// service.onToolMessage(msg => state.addMessage(msg));
		// // service.onError(err =>
		// //     state.addMessage({
		// //         id: uuidv4(),
		// //         role: 'assistant',
		// //         message: '',
		// //         timestamp: new Date(),
		// //         error: err.message
		// //     })
		// // );
		// //service.onAssistantMessage(msg => state.addMessage(msg));
	}

	send(text: string): Promise<void> {
		const msg: UserMessage = {
			id: uuidv4(),
			role: 'user',
			message: text,
			timestamp: new Date()
		};
		this.state.addMessage(msg);
		return this.service.send(msg, this.state.getThreadId());
	}

	async approveToolCall(toolCallId: string): Promise<void> {
		this.state.updateApprovalRequest(toolCallId, true);
		return this.service.sendApproval(toolCallId, true, this.state.getThreadId());
	}

	async denyToolCall(toolCallId: string): Promise<void> {
		this.state.updateApprovalRequest(toolCallId, false);
		return this.service.sendApproval(toolCallId, false, this.state.getThreadId());
	}

	private assignToolInstance(toolName: string): number {
		if (!this.toolInstanceCounts[toolName]) {
			this.toolInstanceCounts[toolName] = 0;
		}
		this.toolInstanceCounts[toolName]++;
		return this.toolInstanceCounts[toolName];
	}

	cancel() {
		this.service.cancel();
	}
}
