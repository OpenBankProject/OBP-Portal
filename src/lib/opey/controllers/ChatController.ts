import { v4 as uuidv4 } from 'uuid';
import type { ChatService, StreamEvent } from '../services/ChatService';
import type { UserMessage } from '../types';
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
                    state.markMessageComplete(event.messageId)
                    break
                case 'error':
                    if (event.messageId) {
                        state.updateMessage(event.messageId, { error: event.error });
                    } else {
                        // System error - add new error message
                        state.addMessage({
                            id: uuidv4(),
                            role: 'assistant',
                            message: '',
                            timestamp: new Date(),
                            error: event.error
                        });
                    }
                    break;
            }
        })

        // EXISTING: Fallback for non-streaming services
        service.onToolMessage(msg => state.addMessage(msg));
        service.onError(err => 
            state.addMessage({
                id: uuidv4(),
                role: 'assistant',
                message: '',
                timestamp: new Date(),
                error: err.message
            })
        );
        service.onAssistantMessage(msg => state.addMessage(msg));
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