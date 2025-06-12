import type { ToolCall } from '../types';

export interface ToolCallApprover {
    approve(call: ToolCall): Promise<void>;
    reject(call: ToolCall): void
}

export class ToolCallController {
    constructor(private approver: ToolCallApprover) { }

    async handle(call: ToolCall) {
        if (call.status === 'awaiting_approval') {
            await this.approver.approve(call)
        }
    }
}