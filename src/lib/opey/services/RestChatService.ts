import { createLogger } from '$lib/utils/logger';
const logger = createLogger('RestChatService');
import type { ChatService, StreamEvent } from "./ChatService";
import { CookieAuthStrategy, type AuthStrategy } from "./AuthStrategy";
import type { UserMessage } from "../types";

export class RestChatService implements ChatService {
    private errorCallback?: (err: Error) => void;
    private streamEventCallback?: (event: StreamEvent) => void;

    constructor(
        private baseUrl: string,
        private auth: AuthStrategy = new CookieAuthStrategy()
    ) { }

    async sendApproval(toolCallId: string, approved: boolean, threadId: string): Promise<void> {
        const init = await this.buildInit({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tool_call_id: toolCallId,
                approval: approved ? "approve" : "deny"
            }),
        })
        
        try {
            const res = await fetch(`${this.baseUrl}/approval/${threadId}`, init)
            if (!res.ok) {
                logger.error(`Failed to send approval: ${res.statusText}`);
                this.errorCallback?.(new Error(`Failed to send approval: ${res.statusText}`));
                return;
            }

            // The approval endpoint returns a streaming response with tool execution events
            // We need to process this stream just like the main /stream endpoint
            const reader = res.body?.getReader();
            if (!reader) {
                logger.error('No response body for approval stream');
                this.errorCallback?.(new Error('No response body for approval stream'));
                return;
            }

            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep the last incomplete line

                    for (const line of lines) {
                        logger.debug(`Approval stream: ${line}`)
                        if (line.startsWith('data: ')) {
                            let eventData;

                            if (line.slice(6).trim() === '[DONE]') {
                                break// Skip the [DONE] line
                            }
                            try {
                                eventData = JSON.parse(line.slice(6));
                            } catch (error) {
                                logger.error("Failed to parse approval stream event data:", error);
                                this.errorCallback?.(new Error(`Failed to parse approval stream event data: ${error}`));
                                continue; // Skip this line if parsing fails
                            }

                            // Process the approval stream events using the same logic as main stream
                            switch (eventData.type) {
                                case 'assistant_start':
                                    this.streamEventCallback?.({
                                        type: 'assistant_start',
                                        messageId: eventData.message_id,
                                        timestamp: new Date(eventData.timestamp),
                                    })
                                    break
                                case 'assistant_token':
                                    this.streamEventCallback?.({
                                        type: 'assistant_token',
                                        messageId: eventData.message_id,
                                        token: eventData.content,
                                    })
                                    break
                                case 'assistant_complete':
                                    this.streamEventCallback?.({
                                        type: 'assistant_complete',
                                        messageId: eventData.message_id,
                                    })
                                    break
                                case 'tool_start':
                                    this.streamEventCallback?.({
                                        type: 'tool_start',
                                        toolCallId: eventData.tool_call_id,
                                        toolInput: eventData.tool_input,
                                        toolName: eventData.tool_name,
                                    })
                                    break
                                case 'tool_token':
                                    this.streamEventCallback?.({
                                        type: 'tool_token',
                                        toolCallId: eventData.tool_call_id,
                                        token: eventData.content,
                                    })
                                    break
                                case 'tool_end':
                                    console.error(`APPROVAL_STREAM_DEBUG: Received tool_end event for ${eventData.tool_call_id}`);
                                    console.error(`APPROVAL_STREAM_DEBUG: Tool output: ${JSON.stringify(eventData.tool_output)?.substring(0, 200)}...`);
                                    console.error(`APPROVAL_STREAM_DEBUG: Tool status: ${eventData.status}`);
                                    
                                    this.streamEventCallback?.({
                                        type: 'tool_complete',
                                        toolCallId: eventData.tool_call_id,
                                        toolName: eventData.tool_name,
                                        toolOutput: eventData.tool_output,
                                        status: eventData.status,
                                    })
                                    
                                    console.error(`APPROVAL_STREAM_DEBUG: Forwarded tool_complete event to callback`);
                                    break
                                case 'error':
                                    if (eventData.message_id) {
                                        this.streamEventCallback?.({
                                            type: 'error',
                                            messageId: eventData.message_id,
                                            error: eventData.error,
                                        })
                                    }
                                    else {
                                        this.streamEventCallback?.({
                                            type: 'error',
                                            error: eventData.error,
                                        })
                                    }
                                    break
                                default:
                                    logger.warn(`Unknown approval stream event type: ${eventData.type}`);
                                    break;
                            }
                        }
                    }
                }
            } catch (streamError) {
                logger.error("Error processing approval stream:", streamError);
                this.errorCallback?.(streamError as Error)
            } finally {
                reader.releaseLock();
            }
        } catch (error) {
            logger.error("Error sending approval:", error);
            this.errorCallback?.(error as Error);
        }
    }

    private async buildInit(init: RequestInit = {}): Promise<RequestInit> {
        const headers = { ...(init.headers || {}), ...(await this.auth.getHeaders()) }
        return { ...init, headers, credentials: "include" }
    }

    async send(msg: UserMessage, threadId?: string): Promise<void> {
        // Create StreamInput with thread_id included
        const streamInput = {
            message: msg.message,
            thread_id: threadId,
            stream_tokens: true
        };
        
        const init = await this.buildInit({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(streamInput),
        })
        const res = await fetch(`${this.baseUrl}/stream`, init)

        // Extract thread_id from response headers if available
        const responseThreadId = res.headers.get('X-Thread-ID');
        if (responseThreadId && responseThreadId !== threadId) {
            logger.debug(`Backend assigned thread_id: ${responseThreadId}, requested: ${threadId}`);
            this.streamEventCallback?.({
                type: 'thread_sync',
                threadId: responseThreadId
            });
        }

        if (!res.ok) {
            // Debug
            if (res.status === 422) {
                const errorData = await res.json();
                logger.debug("Validation error response:", errorData);
                logger.error(`Validation error: ${errorData.detail[0].msg} {${errorData.detail[0].field}}`);
            }

            // System-level error - use onError callback
            const error = new Error(`Failed to send message: ${res.statusText}`);
            this.errorCallback?.(error);
            return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
            this.errorCallback?.(new Error('No response body'));
            return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the last incomplete line

                for (const line of lines) {
                    logger.debug(line)
                    if (line.startsWith('data: ')) {
                        let eventData;

                        if (line.slice(6).trim() === '[DONE]') {
                            break// Skip the [DONE] line
                        }
                        try {
                            eventData = JSON.parse(line.slice(6));
                        } catch (error) {
                            logger.error("Failed to parse event data:", error);
                            this.errorCallback?.(new Error(`Failed to parse event data: ${error}`));
                            continue; // Skip this line if parsing fails
                        }

                        // Handle the event based on its type
                        // This switch takes the eventData type from Opey API and translates it into a StreamEvent
                        // that is handled by the ChatController
                        switch (eventData.type) {
                            case 'assistant_start':
                                this.streamEventCallback?.({
                                    type: 'assistant_start',
                                    messageId: eventData.message_id,
                                    timestamp: new Date(eventData.timestamp),
                                })
                                break
                            case 'assistant_token':
                                this.streamEventCallback?.({
                                    type: 'assistant_token',
                                    messageId: eventData.message_id,
                                    token: eventData.content,
                                })
                                break
                            case 'assistant_complete':
                                this.streamEventCallback?.({
                                    type: 'assistant_complete',
                                    messageId: eventData.message_id,
                                })
                                break
                            case 'tool_start':
                                this.streamEventCallback?.({
                                    type: 'tool_start',
                                    toolCallId: eventData.tool_call_id,
                                    toolInput: eventData.tool_input,
                                    toolName: eventData.tool_name,
                                })
                                break
                            case 'tool_token':
                                this.streamEventCallback?.({
                                    type: 'tool_token',
                                    toolCallId: eventData.tool_call_id,
                                    token: eventData.content,
                                })
                                break
                            case 'tool_end':
                                console.error(`MAIN_STREAM_DEBUG: Received tool_end event for ${eventData.tool_call_id}`);
                                console.error(`MAIN_STREAM_DEBUG: Tool output: ${JSON.stringify(eventData.tool_output)?.substring(0, 200)}...`);
                                console.error(`MAIN_STREAM_DEBUG: Tool status: ${eventData.status}`);
                                
                                this.streamEventCallback?.({
                                    type: 'tool_complete',
                                    toolCallId: eventData.tool_call_id,
                                    toolName: eventData.tool_name,
                                    toolOutput: eventData.tool_output,
                                    status: eventData.status,
                                })
                                
                                console.error(`MAIN_STREAM_DEBUG: Forwarded tool_complete event to callback`);
                                break
                            case 'error':
                                if (eventData.message_id) {
                                    this.streamEventCallback?.({
                                        type: 'error',
                                        messageId: eventData.message_id,
                                        error: eventData.error,
                                    })
                                }
                                else {
                                    this.streamEventCallback?.({
                                        type: 'error',
                                        error: eventData.error,
                                    })
                                }
                                break
                            case 'approval_request':
                                this.streamEventCallback?.({
                                    type: 'approval_request',
                                    toolCallId: eventData.tool_call_id,
                                    toolName: eventData.tool_name,
                                    toolInput: eventData.tool_input,
                                    description: eventData.description,
                                })
                                break
                            default:
                                logger.warn(`Unknown event type: ${eventData.type}`);
                                break;
                        }
                    }
                }
            }
        } catch (error) {
            this.errorCallback?.(error as Error)
        } finally {
            reader.releaseLock();
        }
    }

    onStreamEvent(fn: (event: StreamEvent) => void) {
        this.streamEventCallback = fn
        // Register the callback to handle streaming events
    }

    onError(fn: (err: Error) => void) {
        this.errorCallback = fn
        // Register the callback to handle errors
    }
    cancel() { /* abort controller */ }
}