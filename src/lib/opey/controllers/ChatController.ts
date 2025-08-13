import { createLogger } from '$lib/utils/logger';
const logger = createLogger('ChatController');
import { v4 as uuidv4 } from 'uuid';
import type { ChatService, StreamEvent } from '../services/ChatService';
import type { ToolMessage, UserMessage } from '../types';
import { ChatState } from '../state/ChatState';

export class ChatController {
    constructor(
        private service: ChatService,
        public state: ChatState
    ) {
        service.onStreamEvent((event: StreamEvent) => {
            switch (event.type) {
                case 'assistant_start':
                    state.addMessage({
                        id: event.messageId,
                        role: 'assistant',
                        message: '',
                        timestamp: event.timestamp,
                        isStreaming: true
                    })
                    break
                case 'assistant_token':
                    state.appendToMessage(event.messageId, event.token)
                    break
                case 'assistant_complete':
                    logger.debug('Marking assistant message as complete:', event);
                    state.markMessageComplete(event.messageId)
                    break
                case 'tool_start':
                    state.addToolMessage({
                        id: event.toolCallId,
                        role: 'tool',
                        message: '',
                        timestamp: new Date(),
                        toolCallId: event.toolCallId,
                        toolName: event.toolName,
                        toolInput: event.toolInput,
                        isStreaming: true
                    } as ToolMessage) // Cast to ToolMessage for type safety
                    break
                case 'tool_token':
                    // We currently dont stream tool ouput, but keep for future compatibility
                    // No action needed for tool token in this implementation
                    break
                case 'tool_complete':
                    // Update the toolMessage with the output and mark as complete
                    state.updateToolMessage(event.toolCallId, {
                        toolOutput: event.toolOutput,
                        error: event.status
                    })

                    state.markMessageComplete(event.toolCallId)
                    break
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
            }
        })

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
        }
        this.state.addMessage(msg);
        return this.service.send(msg);
    }

    cancel() {
        this.service.cancel();
    }
}