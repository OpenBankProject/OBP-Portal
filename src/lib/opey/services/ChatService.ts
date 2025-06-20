/**
 * Base Interface for chat services. Used to create implementations like RestChatService or WebSocketChatService.
 * 
 */

import type { UserMessage, AssistantMessage, ToolMessage } from '../types'

// Only modify if there is some base logic that needs to be shared across all chat services.
// Else just create a new implementation of ChatService.
export interface ChatService {
    send(msg: UserMessage): Promise<void>

    /**
     * Called for streaming events during chat interactions.
     * Handles token-by-token streaming, tool calls, and message lifecycle events.
     */
    onStreamEvent(fn: (event: StreamEvent) => void): void

    /**
     * Called when a complete assistant message is received (fallback for non-streaming).
     * @deprecated Use onStreamEvent for streaming responses
     */
    onAssistantMessage(fn: (msg: AssistantMessage) => void): void
    
    onAssistantMessage(fn: (msg: AssistantMessage) => void): void
    onToolMessage(fn: (msg: ToolMessage) => void): void
    onError(fn: (err: Error) => void): void
    cancel(): void
}

export type StreamEvent = 
    | { type: 'assistant_start', messageId: string, timestamp: Date }
    | { type: 'assistant_token', messageId: string, token: string }
    | { type: 'assistant_complete', messageId: string }
    | { type: 'tool_start', messageId: string, toolName: string }
    | { type: 'tool_token', messageId: string, token: string }
    | { type: 'tool_complete', messageId: string, result: any }
    | { type: 'error', messageId?: string, error: string }