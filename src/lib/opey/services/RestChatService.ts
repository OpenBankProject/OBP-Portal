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
		logger.info('Initialized Opey Chat with baseUrl:', baseUrl);
		logger.debug('Auth strategy:', auth.constructor.name);
	}

	async sendApproval(toolCallId: string, approved: boolean, threadId: string): Promise<void> {
		logger.info(
			`Sending approval for toolCallId=${toolCallId}, approved=${approved}, threadId=${threadId}`
		);
		const requestBody = {
			tool_call_id: toolCallId,
			approval: approved ? 'approve' : 'deny'
		};
		logger.debug(`Approval request body:`, requestBody);

		const init = await this.buildInit({
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});

		return this.handleStreamingResponse(`${this.baseUrl}/approval/${threadId}`, init);
	}

	private async buildInit(init: RequestInit = {}): Promise<RequestInit> {
		const headers = { ...(init.headers || {}), ...(await this.auth.getHeaders()) };
		return { ...init, headers, credentials: 'include' };
	}

	async send(msg: UserMessage, threadId?: string): Promise<void> {
		logger.info(`Sending message with threadId=${threadId}, messageId=${msg.id}`);
		logger.debug(
			`Message content: "${msg.message.substring(0, 100)}${msg.message.length > 100 ? '...' : ''}"`
		);

		// Create StreamInput with thread_id included
		const streamInput = {
			message: msg.message,
			thread_id: threadId,
			stream_tokens: true
		};

		logger.debug(`Stream input:`, streamInput);

		const init = await this.buildInit({
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(streamInput)
		});

		return this.handleStreamingResponse(`${this.baseUrl}/stream`, init, threadId);
	}

	private async handleStreamingResponse(
		url: string,
		init: RequestInit,
		threadId?: string
	): Promise<void> {
		logger.debug(`Making request to: ${url}`);
		logger.debug(`Request headers:`, init.headers);

		let res: Response;
		try {
			res = await fetch(url, init);
		} catch (fetchError) {
			logger.error(`Network error during fetch to ${url}:`, fetchError);
			this.errorCallback?.(new Error(`Network error: ${(fetchError as Error).message}`));
			return;
		}

		logger.debug(`Response status: ${res.status} ${res.statusText}`);
		logger.debug(`Response headers:`, Object.fromEntries(res.headers.entries()));

		// Handle thread ID syncing
		if (threadId) {
			const responseThreadId = res.headers.get('X-Thread-ID');
			logger.debug(`Thread ID sync: request=${threadId}, response=${responseThreadId}`);
			if (responseThreadId && responseThreadId !== threadId) {
				logger.info(`Thread ID sync event: ${threadId} -> ${responseThreadId}`);
				this.streamEventCallback?.({
					type: 'thread_sync',
					threadId: responseThreadId
				});
			}
		}

		if (!res.ok) {
			let errorMessage = `HTTP ${res.status}: ${res.statusText}`;

			try {
				const errorData = await res.json();
				logger.debug(`Error response data:`, errorData);
				if (res.status === 422 && errorData.detail?.[0]) {
					errorMessage = `Validation error: ${errorData.detail[0].msg} (${errorData.detail[0].field})`;
				} else {
					errorMessage = errorData.error || errorData.message || errorData || errorMessage;
				}
			} catch (parseError) {
				logger.debug(`Failed to parse error response:`, parseError);
				// Use HTTP status fallback
			}

			logger.error(`Service error: ${errorMessage}`);
			this.errorCallback?.(new Error(errorMessage));
			return;
		}

		const reader = res.body?.getReader();
		if (!reader) {
			logger.error('No response body available for streaming');
			this.errorCallback?.(new Error('No response body'));
			return;
		}

		logger.debug('Starting stream processing...');
		await this.processStream(reader);
	}

	private async processStream(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
		const decoder = new TextDecoder();
		let buffer = '';
		let eventCount = 0;
		let lastEventTime = Date.now();

		logger.debug('Stream processing started');

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					logger.debug(`Stream completed naturally. Total events processed: ${eventCount}`);
					break;
				}

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || ''; // Keep the last incomplete line

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const rawData = line.slice(6).trim();
						logger.debug(`Raw stream data: ${rawData}`);

						if (rawData === '[DONE]') {
							logger.debug('Received [DONE] marker, ending stream');
							return; // Exit the function completely
						}

						try {
							const eventData = JSON.parse(rawData);
							eventCount++;
							lastEventTime = Date.now();
							logger.debug(`Processing event ${eventCount}:`, eventData);
							this.handleStreamEvent(eventData);
						} catch (error) {
							logger.error('Failed to parse event data:', error);
							logger.error('Problematic line:', rawData);
							this.errorCallback?.(new Error(`Failed to parse event data: ${error}`));
							continue; // Skip this line if parsing fails
						}
					} else if (line.trim() && !line.startsWith('event:') && !line.startsWith('id:')) {
						logger.debug(`Non-data stream line: ${line}`);
					}
				}

				// Check for stream timeout (no events received for 30 seconds)
				if (eventCount > 0 && Date.now() - lastEventTime > 30000) {
					logger.warn('Stream appears to have stalled - no events for 30 seconds');
					this.errorCallback?.(new Error('Stream timeout - no events received'));
					break;
				}
			}
		} catch (error) {
			logger.error('Error during stream processing:', error);
			this.errorCallback?.(error as Error);
		} finally {
			logger.debug(`Stream processing ended. Final event count: ${eventCount}`);
			reader.releaseLock();
		}
	}

	private handleStreamEvent(eventData: any): void {
		logger.debug(`Processing stream event: ${eventData.type}`, eventData);

		// Validate event structure
		if (!eventData.type) {
			logger.warn('Received stream event without type field:', eventData);
			return;
		}

		switch (eventData.type) {
			case 'assistant_start':
				logger.debug(`Assistant message started: ${eventData.message_id}`);
				this.streamEventCallback?.({
					type: 'assistant_start',
					messageId: eventData.message_id,
					timestamp: new Date(eventData.timestamp)
				});
				break;
			case 'assistant_token':
				logger.debug(`Assistant token for ${eventData.message_id}: "${eventData.content}"`);
				this.streamEventCallback?.({
					type: 'assistant_token',
					messageId: eventData.message_id,
					token: eventData.content
				});
				break;
			case 'assistant_complete':
				logger.info(`Assistant message completed: ${eventData.message_id}`);
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
					description: eventData.description
				});
				break;
			default:
				logger.warn(`Unknown event type: ${eventData.type}`, eventData);
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
