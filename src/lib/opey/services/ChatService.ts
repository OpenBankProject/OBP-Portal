/**
 * Base Interface for chat services. Used to create implementations like RestChatService or WebSocketChatService.
 * 
 */

import type { UserMessage, AssistantMessage, ToolMessage } from '../types'

// Only modify if there is some base logic that needs to be shared across all chat services.
// Else just create a new implementation of ChatService.
export interface ChatService {
    send(msg: UserMessage): Promise<void>
    onAssistantMessage(fn: (msg: AssistantMessage) => void): void
    onToolMessage(fn: (msg: ToolMessage) => void): void
    onError(fn: (err: Error) => void): void
    cancel(): void
}