<script lang="ts">
    import { Accordion, Avatar } from '@skeletonlabs/skeleton-svelte';
    import { renderMarkdown } from '$lib/markdown/helper-funcs';
    import type { BaseMessage, ToolMessage as ToolMessageType } from '$lib/opey/types';
    import { ToolMessage } from './tool-messages';

    // Props
    interface Props {
        message: BaseMessage;
        previousMessageRole?: string;
        onApprove?: (toolCallId: string) => Promise<void>;
        onDeny?: (toolCallId: string) => Promise<void>;
        userName?: string;
    }
    
    let { message, previousMessageRole, onApprove, onDeny, userName = 'Guest' }: Props = $props();
    
    // Should we show the avatar?
    let showAvatar = $derived(
        message.role !== previousMessageRole || 
        !['assistant', 'tool', 'approval_request'].includes(previousMessageRole || '')
    );
</script>

<!-- Message container -->
<div class="flex flex-col items-{message.role === 'user' ? 'end' : 'start'} justify-start">
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
        <hr class="hr" />
    {/if}
    
    <!-- Message content -->
    <div class="max-w-full">
        {#if message.role === 'user'}
            <div class="preset-filled-tertiary-500 max-w-3/5 rounded-2xl p-2 text-white">
                {message.message}
            </div>
        {:else if message.role === 'assistant'}
            <div class="prose dark:prose-invert max-w-full rounded-2xl p-2 text-left">
                {@html renderMarkdown(message.message)}
            </div>
        {:else if message.role === 'tool'}
            <ToolMessage 
                message={message as ToolMessageType} 
                {onApprove} 
                {onDeny}
            />
        {/if}
            
    </div>
</div>