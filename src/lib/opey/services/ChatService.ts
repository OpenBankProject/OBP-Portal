/**
 * Base Interface for chat services. Used to create implementations like RestChatService or WebSocketChatService.
 * 
 */

import type { UserMessage, AssistantMessage, ToolMessage } from '../types'

// Only modify if there is some base logic that needs to be shared across all chat services.
// Else just create a new implementation of ChatService.
export interface ChatService {
    send(msg: UserMessage, threadId?: string): Promise<void>
    sendApproval(toolCallId: string, approved: boolean, threadId: string): Promise<void>

    /**
     * Called for streaming events during chat interactions.
     * Handles token-by-token streaming, tool calls, and message lifecycle events.
     */
    onStreamEvent(fn: (event: StreamEvent) => void): void
    onError(fn: (err: Error) => void): void
    cancel(): void
}

export type StreamEvent = 
    | { type: 'assistant_start', messageId: string, timestamp: Date }
    | { type: 'assistant_token', messageId: string, token: string }
    | { type: 'assistant_complete', messageId: string }
    | { type: 'tool_start', toolCallId: string, toolName: string, toolInput: Record<string, any> }
    | { type: 'tool_token', toolCallId: string, token: string }
    | { type: 'tool_complete', toolCallId: string, toolName: string, toolOutput: any, status: 'success' | 'error' }
    | { type: 'approval_request', toolCallId: string, toolName: string, toolInput: Record<string, any>, description?: string }
    | { type: 'thread_sync', threadId: string }
    | { type: 'error', messageId?: string, error: string }