import { createLogger } from '$lib/utils/logger';
const logger = createLogger('RestChatService');
import type { ChatService, StreamEvent } from './ChatService';
import { CookieAuthStrategy, type AuthStrategy } from './AuthStrategy';
import type { UserMessage } from '../types';

export class RestChatService implements ChatService {
	private errorCallback?: (err: Error) => void;
	private streamEventCallback?: (event: StreamEvent) => void;

	constructor(
		private baseUrl: string,
		private auth: AuthStrategy = new CookieAuthStrategy()
	) {

		logger.info("Initialized Opey Chat with baseUrl:", baseUrl)
	}

	async sendApproval(
		toolCallId: string, 
		approved: boolean, 
		threadId: string, 
		approvalLevel?: string
	): Promise<void> {
		logger.info(`Sending approval for toolCallId=${toolCallId}, approved=${approved}, level=${approvalLevel}, threadId=${threadId}`);
		
		// New format: use /stream endpoint with tool_call_approval
		const payload = {
			message: "", // Empty for approvals
			thread_id: threadId,
			tool_call_approval: {
				approval: approved ? 'approve' : 'deny',
				level: approvalLevel || 'once',
				tool_call_id: toolCallId
			}
		};
		
		const init = await this.buildInit({
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		return this.handleStreamingResponse(`${this.baseUrl}/stream`, init);
	}

	async sendBatchApproval(
		decisions: Record<string, { approved: boolean; level: string }>,
		threadId: string
	): Promise<void> {
		logger.info(`Sending batch approval for ${Object.keys(decisions).length} tools, threadId=${threadId}`);
		
		const payload = {
			message: "", // Empty for approvals
			thread_id: threadId,
			tool_call_approval: {
				batch_decisions: decisions
			}
		};
		
		const init = await this.buildInit({
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		return this.handleStreamingResponse(`${this.baseUrl}/stream`, init);
	}

	private async buildInit(init: RequestInit = {}): Promise<RequestInit> {
		const headers = { ...(init.headers || {}), ...(await this.auth.getHeaders()) };
		return { ...init, headers, credentials: 'include' };
	}

	async send(msg: UserMessage, threadId?: string): Promise<void> {
		// Create StreamInput with thread_id included
		const streamInput = {
			message: msg.message,
			thread_id: threadId,
			stream_tokens: true
		};

		const init = await this.buildInit({
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(streamInput)
		});
		
		return this.handleStreamingResponse(`${this.baseUrl}/stream`, init, threadId);
	}

	private async handleStreamingResponse(url: string, init: RequestInit, threadId?: string): Promise<void> {
		const res = await fetch(url, init);

		// Handle thread ID syncing
		if (threadId) {
			const responseThreadId = res.headers.get('X-Thread-ID');
			if (responseThreadId && responseThreadId !== threadId) {
				this.streamEventCallback?.({
					type: 'thread_sync',
					threadId: responseThreadId
				})
			}
		}

		if (!res.ok) {
			let errorMessage = `HTTP ${res.status}: ${res.statusText}`;

			try {
				const errorData = await res.json();
				if (res.status === 422 && errorData.detail?.[0]) {
					errorMessage = `Validation error: ${errorData.detail[0].msg} (${errorData.detail[0].field})`;
				} else {
					errorMessage = errorData.error || errorData.message || errorData || errorMessage;
				}
			} catch {
				// Use HTTP status fallback
			}

			console.error(`Service error: ${errorMessage}`);
			this.errorCallback?.(new Error(errorMessage));
			return;
		}

		const reader = res.body?.getReader();
		if (!reader) {
			this.errorCallback?.(new Error('No response body'));
			return;
		}

		await this.processStream(reader);
	}

	private async processStream(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
		const decoder = new TextDecoder();
		let buffer = '';

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || ''; // Keep the last incomplete line

				for (const line of lines) {
					//logger.debug(line);
					if (line.startsWith('data: ')) {
						let eventData;

						if (line.slice(6).trim() === '[DONE]') {
							break; // Skip the [DONE] line
						}
						try {
							eventData = JSON.parse(line.slice(6));
							this.handleStreamEvent(eventData);
						} catch (error) {
							logger.error('Failed to parse event data:', error);
							this.errorCallback?.(new Error(`Failed to parse event data: ${error}`));
							continue; // Skip this line if parsing fails
						}
					}
				}
			}
		} catch (error) {
			this.errorCallback?.(error as Error);
		} finally {
			reader.releaseLock();
		}
	}

	private handleStreamEvent(eventData: any): void {
		logger.debug('Received stream event data:', eventData);
		switch (eventData.type) {
			case 'assistant_start':
				this.streamEventCallback?.({
					type: 'assistant_start',
					messageId: eventData.message_id,
					timestamp: new Date(eventData.timestamp)
				});
				break;
			case 'assistant_token':
				this.streamEventCallback?.({
					type: 'assistant_token',
					messageId: eventData.message_id,
					token: eventData.content
				});
				break;
			case 'assistant_complete':
				this.streamEventCallback?.({
					type: 'assistant_complete',
					messageId: eventData.message_id
				});
				break;
			case 'tool_start':
				this.streamEventCallback?.({
					type: 'tool_start',
					toolCallId: eventData.tool_call_id,
					toolInput: eventData.tool_input,
					toolName: eventData.tool_name
				});
				break;
			case 'tool_token':
				this.streamEventCallback?.({
					type: 'tool_token',
					toolCallId: eventData.tool_call_id,
					token: eventData.content
				});
				break;
			case 'tool_complete':
				this.streamEventCallback?.({
					type: 'tool_complete',
					toolCallId: eventData.tool_call_id,
					toolName: eventData.tool_name,
					toolOutput: eventData.tool_output,
					status: eventData.status
				});
				break;
			case 'error':
				this.streamEventCallback?.({
					type: 'error',
					messageId: eventData.message_id,
					error: eventData.error
				});
				break;
			case 'approval_request':
				this.streamEventCallback?.({
					type: 'approval_request',
					toolCallId: eventData.tool_call_id,
					toolName: eventData.tool_name,
					toolInput: eventData.tool_input,
					message: eventData.message || 'Approval required',
					riskLevel: eventData.risk_level || 'medium',
					affectedResources: eventData.affected_resources || [],
					reversible: eventData.reversible !== undefined ? eventData.reversible : true,
					estimatedImpact: eventData.estimated_impact || '',
					similarOperationsCount: eventData.similar_operations_count || 0,
					availableApprovalLevels: eventData.available_approval_levels || ['user'],
					defaultApprovalLevel: eventData.default_approval_level || 'user'
				});
				break;
			case 'batch_approval_request':
				this.streamEventCallback?.({
					type: 'batch_approval_request',
					toolCalls: eventData.tool_calls.map((tc: any) => ({
						toolCallId: tc.tool_call_id,
						toolName: tc.tool_name,
						toolInput: tc.tool_input,
						message: tc.message || 'Approval required',
						riskLevel: tc.risk_level || 'moderate',
						affectedResources: tc.affected_resources || [],
						reversible: tc.reversible !== undefined ? tc.reversible : true,
						estimatedImpact: tc.estimated_impact || '',
						similarOperationsCount: tc.similar_operations_count || 0,
						availableApprovalLevels: tc.available_approval_levels || ['once', 'session'],
						defaultApprovalLevel: tc.default_approval_level || 'once',
						operation: tc.operation,
						endpoint: tc.endpoint,
						method: tc.method
					})),
					options: eventData.options || []
				});
				break;
			default:
				console.warn(`Unknown event type: ${eventData.type}`);
				break;
		}
	}


	onStreamEvent(fn: (event: StreamEvent) => void) {
		this.streamEventCallback = fn;
		// Register the callback to handle streaming events
	}

	onError(fn: (err: Error) => void) {
		this.errorCallback = fn;
		// Register the callback to handle errors
	}
	cancel() {
		/* abort controller */
	}
}
