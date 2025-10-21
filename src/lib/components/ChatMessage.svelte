<script lang="ts">
    import { Accordion, Avatar } from '@skeletonlabs/skeleton-svelte';
    import { renderMarkdown } from '$lib/markdown/helper-funcs';
    import type { BaseMessage, ToolMessage as ToolMessageType } from '$lib/opey/types';
    import { ToolMessage } from './tool-messages';

    // Props
    interface Props {
        message: BaseMessage;
        previousMessageRole?: string;
        onApprove?: (toolCallId: string, approvalLevel?: string) => Promise<void>;
        onDeny?: (toolCallId: string) => Promise<void>;
        onBatchSubmit?: (decisions: Map<string, { approved: boolean; level: string }>) => Promise<void>;
        batchApprovalGroup?: ToolMessageType[];
        userName?: string;
    }
    
    let { message, previousMessageRole, onApprove, onDeny, onBatchSubmit, batchApprovalGroup, userName = 'Guest' }: Props = $props();
    
    // Helper to determine the display role (tool messages are treated as assistant for avatar purposes)
    let displayRole = $derived(
        message.role === 'tool' ? 'assistant' : message.role
    );
    
    let previousDisplayRole = $derived(
        previousMessageRole === 'tool' ? 'assistant' : previousMessageRole
    );
    
    // Should we show the avatar? - Show avatar for first message or when display role changes
    let showAvatar = $derived(
        !previousDisplayRole || displayRole !== previousDisplayRole
    );
    
    // Compute alignment class
    let alignmentClass = $derived(
        message.role === 'user' ? 'items-end' : 'items-start'
    );
</script>

<!-- Message container -->
<div class="flex flex-col {alignmentClass} justify-start">
    <!-- Avatar and name header -->
    {#if showAvatar}
        <div class="mb-2 flex items-center gap-2">
            {#if message.role === 'user'}
                <p class="text-s font-bold">{userName}</p>
                <Avatar
                    name={userName}
                    classes="w-7 h-7 border p-1 bg-secondary-50 border-primary-500"
                />
            {:else}
                <Avatar
                    src="/opey-icon-white.png"
                    name="opey"
                    classes="w-7 h-7 border p-1 bg-secondary-500 border-primary-500"
                />
                <p class="text-s font-bold">Opey</p>
            {/if}
        </div>
    {/if}
    
    <!-- Message content -->
    <div class="{message.role === 'user'? 'max-w-3/5' : 'max-w-full'} mt-3">
        {#if message.role === 'user'}
            <div class="preset-filled-tertiary-500 max-w-full rounded-2xl p-2 text-white">
                {message.message}
            </div>
        {:else if message.role === 'assistant'}
            <hr class="hr" />
            <div class="prose dark:prose-invert max-w-full rounded-2xl p-2 text-left">
                {@html renderMarkdown(message.message)}
            </div>
        {:else if message.role === 'tool'}
            <ToolMessage 
                message={message as ToolMessageType} 
                {onApprove} 
                {onDeny}
                {onBatchSubmit}
                {batchApprovalGroup}
            />
        {/if}
            
    </div>
</div>