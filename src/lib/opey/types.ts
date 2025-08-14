// import type { ToolCall as LangChainToolCall } from '@langchain/core/messages/tool'

export type Role = 'user' | 'assistant' | 'tool' | 'error' | 'approval_request';
export interface BaseMessage {
    id: string; // i.e. UUID4
    role: Role;
    message: string;
    timestamp: Date; // ISO string
    isStreaming?: boolean 
    error?: string;
}

export interface UserMessage extends BaseMessage {
    role: "user";
    // Additional fields specific to user messages can be added here
}
export interface AssistantMessage extends BaseMessage {
    role: "assistant";
    toolCalls?: ToolCall[];
    // Probably we will need some fields here for tool call/ tool call approval requests
}

export interface ErrorMessage extends BaseMessage {
    role: "error";
    // Additional fields specific to error messages can be added here
    error: string; // Error message text
}

export interface ToolMessage extends BaseMessage {
    role: 'tool'
    toolName: string; // Name of the tool being called
    toolCallId: string
    toolInput: Record<string, any>; // Input parameters for the tool call
    status?: 'success' | 'error' 
    toolOutput?: any; // Output from the tool call, if available
    instanceNumber?: number; // Instance number for display (e.g., "retrieve_endpoints (2)")
}

export interface ApprovalRequestMessage extends BaseMessage {
    role: 'approval_request'
    toolName: string; // Name of the tool requesting approval
    toolCallId: string
    toolInput: Record<string, any>; // Input parameters for the tool call
    description?: string; // Human-readable description of what the tool will do
    approved?: boolean; // Whether the user has approved/denied this request
}

export interface ToolCall {
    id: string;
    name: string;
    args: Record<string, any>;
    status: "pending" | "awaiting_approval" | "error" | "success" // LangChainToolCall is a type from the LangChain library
    result?: any // used for when we have a successful tool call and need to link the result to the tool call
    error?: string;
}