import { v4 as uuidv4 } from 'uuid';
import type { ChatService } from '../services/ChatService';
import type { UserMessage } from '../types';
import { ChatState } from '../state/ChatState';

export class ChatController {
    constructor(
        private service: ChatService,
        public state: ChatState
    ) {
        service.onAssistantMessage(msg => state.addMessage(msg))
        service.onToolMessage(msg => state.addMessage(msg))
        service.onError(err => 
            state.addMessage({
                id: uuidv4(),
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                error: err.message
            })
        )
    }

    send(text: string): Promise<void> {
        const msg: UserMessage = {
            id: uuidv4(),
            role: 'user',
            content: text,
            timestamp: new Date()
        }
        this.state.addMessage(msg);
        return this.service.send(msg);
    }

    cancel() {
        this.service.cancel();
    }
}