import type { ToolCall as LangChainToolCall } from '@langchain/core/messages/tool'

export interface OpeyMessage {
    id: string; // i.e. UUID4
    role: "assistant" | "user" | "tool";
    content: string;
    error?: string;
    loading?: boolean;
}

export interface AssistantMessage extends OpeyMessage {
    toolCalls: OpeyToolCall[];
    // Probably we will need some fields here for tool call/ tool call approval requests
}

export interface OpeyToolCall {
    status: "pending" | "awaiting_approval" | "error" | "success"
    toolCall: LangChainToolCall; // LangChainToolCall is a type from the LangChain library
    output?: string | object // used for when we have a successful tool call and need to link the result to the tool call
}

export interface OpeyChatState {
    messages: OpeyMessage[];
    currentAssistantMessage: AssistantMessage;
    status: 'ready' | 'streaming' | 'error' | 'loading';
    userIsAuthenticated: boolean;
    threadId: string;
}