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
			logger.debug('Received stream event:', event);
			try {
				switch (event.type) {
					case 'thread_sync':
						logger.debug(`Syncing thread_id with backend: ${event.threadId}`);
						state.syncThreadId(event.threadId);
						break;
					case 'assistant_start':
						logger.debug(`assistant_start: Creating new assistant message with ID: ${event.messageId}`);
						state.addMessage({
							id: event.messageId,
							role: 'assistant',
							message: '',
							timestamp: event.timestamp,
							isStreaming: true
						});
						break;
					case 'assistant_token':
						logger.debug(`assistant_token: Appending token to message ID: ${event.messageId}`);
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
							event.message,
							{
								riskLevel: event.riskLevel,
								affectedResources: event.affectedResources,
								reversible: event.reversible,
								estimatedImpact: event.estimatedImpact,
								similarOperationsCount: event.similarOperationsCount,
								availableApprovalLevels: event.availableApprovalLevels,
								defaultApprovalLevel: event.defaultApprovalLevel
							}
						);
						break;
					case 'batch_approval_request':
						logger.debug(`Received batch approval request for ${event.toolCalls.length} tools`);
						state.addBatchApprovalRequest(event.toolCalls);
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

	/**
	 * Approve a tool call that's waiting for user approval.
	 * Updates the UI state optimistically and sends approval to backend.
	 * 
	 * @param toolCallId - The tool call ID to approve
	 * @param approvalLevel - Optional approval level (defaults to the tool's defaultApprovalLevel or 'user')
	 */
	async approveToolCall(toolCallId: string, approvalLevel?: string): Promise<void> {
		logger.debug(`Approving tool call: ${toolCallId} with level: ${approvalLevel || 'default'}`);
		
		// Get the tool message to access its default approval level
		const toolMessage = this.state.getToolMessageByCallId(toolCallId);
		const levelToUse = approvalLevel || toolMessage?.defaultApprovalLevel || 'user';
		
		// Update state optimistically
		this.state.updateApprovalRequest(toolCallId, true);
		this.state.updateToolMessage(toolCallId, {
			approvalStatus: 'approved',
			approvalLevel: levelToUse,
			waitingForApproval: false
			// Note: isStreaming will be set to true when tool_start event arrives
		});

		try {
			await this.service.sendApproval(toolCallId, true, this.state.getThreadId(), levelToUse);
		} catch (error) {
			logger.error(`Failed to send approval for ${toolCallId}:`, error);
			// Revert optimistic update on error
			this.state.updateToolMessage(toolCallId, {
				approvalStatus: undefined,
				approvalLevel: undefined,
				waitingForApproval: true,
				error: `Failed to send approval: ${error instanceof Error ? error.message : 'Unknown error'}`
			});
			throw error;
		}
	}

	/**
	 * Deny a tool call that's waiting for user approval.
	 * Updates the UI state and sends denial to backend.
	 */
	async denyToolCall(toolCallId: string): Promise<void> {
		logger.debug(`Denying tool call: ${toolCallId}`);
		
		// Update state
		this.state.updateApprovalRequest(toolCallId, false);
		this.state.updateToolMessage(toolCallId, {
			approvalStatus: 'denied',
			waitingForApproval: false,
			isStreaming: false,
			status: 'error',
			toolOutput: 'Tool execution was denied by user'
		});

		try {
			await this.service.sendApproval(toolCallId, false, this.state.getThreadId());
		} catch (error) {
			logger.error(`Failed to send denial for ${toolCallId}:`, error);
			// Error sending denial - but user already saw it as denied, so just log
			this.state.updateToolMessage(toolCallId, {
				error: `Failed to send denial: ${error instanceof Error ? error.message : 'Unknown error'}`
			});
		}
	}

	/**
	 * Submit batch approval decisions for multiple tool calls at once.
	 * 
	 * @param decisions - Map of toolCallId to approval decision and level
	 */
	async submitBatchApproval(
		decisions: Map<string, { approved: boolean; level: string }>
	): Promise<void> {
		logger.debug(`Submitting batch approval for ${decisions.size} tools`);
		
		// Update state optimistically for all decisions
		decisions.forEach((decision, toolCallId) => {
			this.state.updateApprovalRequest(toolCallId, decision.approved);
			
			if (decision.approved) {
				this.state.updateToolMessage(toolCallId, {
					approvalStatus: 'approved',
					approvalLevel: decision.level,
					waitingForApproval: false
					// isStreaming will be set to true when tool_start event arrives
				});
			} else {
				this.state.updateToolMessage(toolCallId, {
					approvalStatus: 'denied',
					waitingForApproval: false,
					isStreaming: false,
					status: 'error',
					toolOutput: 'Tool execution was denied by user'
				});
			}
		});

		try {
			// Convert Map to Record format expected by backend
			const batchDecisions: Record<string, { approved: boolean; level: string }> = {};
			decisions.forEach((decision, toolCallId) => {
				batchDecisions[toolCallId] = decision;
			});
			
			await this.service.sendBatchApproval(batchDecisions, this.state.getThreadId());
		} catch (error) {
			logger.error('Failed to send batch approval:', error);
			// Revert optimistic updates on error
			decisions.forEach((decision, toolCallId) => {
				this.state.updateToolMessage(toolCallId, {
					approvalStatus: undefined,
					approvalLevel: undefined,
					waitingForApproval: true,
					error: `Failed to send approval: ${error instanceof Error ? error.message : 'Unknown error'}`
				});
			});
			throw error;
		}
	}

	/**
	 * Get all pending approval requests from the state.
	 */
	getPendingApprovals(): ToolMessage[] {
		return this.state.getPendingApprovals();
	}

	/**
	 * Stop the current streaming response.
	 */
	async stop(): Promise<void> {
		logger.debug('Stopping chat stream');
		
		// First mark all streaming messages as complete to prevent appending
		this.state.stopAllStreaming();
		
		// Then call the service to stop the backend stream
		await this.service.cancel(this.state.getThreadId());
	}

	private assignToolInstance(toolName: string): number {
		if (!this.toolInstanceCounts[toolName]) {
			this.toolInstanceCounts[toolName] = 0;
		}
		this.toolInstanceCounts[toolName]++;
		return this.toolInstanceCounts[toolName];
	}

	async cancel(): Promise<void> {
		await this.service.cancel(this.state.getThreadId());
	}
}
