<script lang="ts">
    import { Accordion } from '@skeletonlabs/skeleton-svelte';
    import type { ToolMessage } from '$lib/opey/types';
    import { ToolError, ObpApiResponse, DefaultToolResponse } from '.';
    import {
        Check,
        Hammer,
        LoaderCircle,
        XCircle,
        Diamond,
        AlertTriangle,
    } from '@lucide/svelte';

    interface Props {
        message: ToolMessage;
        onApprove?: (toolCallId: string) => Promise<void>;
        onDeny?: (toolCallId: string) => Promise<void>;
    }
    
    let { message, onApprove, onDeny }: Props = $props();
    
    // Helper function for tool display names
    function getToolDisplayName(toolName: string, instanceNumber: number): string {
        switch (toolName) {
            case 'retrieve_endpoints':
                return `Endpoint Retrieval - Finding API endpoints (${instanceNumber})`;
            case 'retrieve_glossary':
                return `Glossary Retrieval - Looking up terminology (${instanceNumber})`;
            default:
                return `Using tool: ${toolName} (${instanceNumber})`;
        }
    }
    
    let isProcessing = $state(false);
    
    async function handleApprove() {
        if (isProcessing || message.approvalStatus === 'approved') return;
        isProcessing = true;
        try {
            if (onApprove) {
                await onApprove(message.toolCallId);
            }
        } finally {
            isProcessing = false;
        }
    }
    
    async function handleDeny() {
        if (isProcessing || message.approvalStatus === 'denied') return;
        isProcessing = true;
        try {
            if (onDeny) {
                await onDeny(message.toolCallId);
            }
        } finally {
            isProcessing = false;
        }
    }
    
    // Determine if approval UI should be shown
    let showApprovalInterface = $derived(
        message.waitingForApproval && 
        message.approvalStatus !== 'approved' && 
        message.approvalStatus !== 'denied'
    );
    
    // Determine status display
    let statusDisplay = $derived.by(() => {
        if (message.status === 'error') return 'Error';
        if (message.approvalStatus === 'denied') return 'Denied';
        if (message.waitingForApproval) return 'Awaiting Approval';
        if (message.isStreaming) return 'Executing...';
        if (message.toolOutput) return 'Complete';
        return 'Pending';
    });
    
    let statusIcon = $derived.by(() => {
        if (message.status === 'error') return XCircle;
        if (message.approvalStatus === 'denied') return XCircle;
        if (message.waitingForApproval) return AlertTriangle;
        if (message.isStreaming) return LoaderCircle;
        if (message.toolOutput) return Check;
        return Diamond;
    });
    
    let statusClass = $derived(() => {
        if (message.status === 'error') return 'stroke-error-500';
        if (message.approvalStatus === 'denied') return 'stroke-error-500';
        if (message.waitingForApproval) return 'stroke-warning-500';
        if (message.isStreaming) return 'stroke-warning-500 animate-spin';
        if (message.toolOutput) return 'stroke-success-500';
        return 'stroke-warning-500';
    });

    // Track open accordion items
    let mainAccordionValue = $state<string[]>(
        message.waitingForApproval || message.isStreaming ? [message.id] : []
    );
    
    let nestedAccordionValue = $state<string[]>([]);
</script>

<Accordion 
    collapsible 
    classes="max-w-full" 
    value={mainAccordionValue} 
    onValueChange={(e) => (mainAccordionValue = e.value)}
>
    <Accordion.Item value={message.id}>
        {#snippet lead()}<Hammer />{/snippet}
        {#snippet control()}
            <div class="flex justify-between">
                <span class:text-error-700={message.status === 'error'}>
                    {getToolDisplayName(
                        message.toolName,
                        message.instanceNumber || 1
                    )}
                    {#if message.status === 'error'}
                        - Failed
                    {/if}
                </span>
                <statusIcon class="{statusClass}"></statusIcon>
            </div>
        {/snippet}
        {#snippet panel()}
            <!-- Tool Status -->
            <div class="mb-2 flex justify-between">
                <span class="text-sm font-medium">Status: {statusDisplay}</span>
            </div>
            
            <!-- Approval Interface - Shown only when waiting for approval -->
            {#if showApprovalInterface}
                <div class="mb-4 border-l-4 border-warning-500 bg-warning-50 p-4 dark:bg-warning-950">
                    <div class="mb-2 text-sm font-semibold text-warning-700 dark:text-warning-300">
                        Tool Approval Required
                    </div>
                    
                    <div class="mb-3 text-sm text-warning-600 dark:text-warning-400">
                        This tool needs your permission to run.
                    </div>
                    
                    <div class="mb-3 text-xs">
                        <strong>Tool:</strong> {message.toolName}
                        <br>
                        <strong>Input:</strong> {JSON.stringify(message.toolInput)}
                    </div>
                    
                    <div class="flex gap-2">
                        <button 
                            onclick={handleApprove}
                            class="btn preset-filled-success-500" 
                            disabled={isProcessing}>
                            {#if isProcessing}
                                <LoaderCircle class="animate-spin" size={16} />
                            {:else}
                                <Check size={16} />
                            {/if}
                            Approve
                        </button>
                        <button 
                            onclick={handleDeny}
                            class="btn preset-filled-error-500" 
                            disabled={isProcessing}>
                            {#if isProcessing}
                                <LoaderCircle class="animate-spin" size={16} />
                            {:else}
                                <XCircle size={16} />
                            {/if}
                            Deny
                        </button>
                    </div>
                </div>
            {/if}
            
            <!-- Tool Input/Output Sections -->
            <Accordion 
                collapsible 
                value={nestedAccordionValue}
                onValueChange={(e) => (nestedAccordionValue = e.value)}
            >
                <Accordion.Item value="input">
                    {#snippet lead()}<Hammer />{/snippet}
                    {#snippet control()}Tool Input{/snippet}
                    {#snippet panel()}
                        <div class="preset-filled-primary-500 max-w-full rounded-2xl p-2 text-white">
                            <pre class="overflow-x-auto text-xs">{JSON.stringify(message.toolInput, null, 2)}</pre>
                        </div>
                    {/snippet}
                </Accordion.Item>
                
                <Accordion.Item value="output" disabled={!!message.isStreaming && !message.toolOutput}>
                    {#snippet lead()}<Hammer />{/snippet}
                    {#snippet control()}
                        <div class="flex justify-between">
                            <span class:text-error-700={message.status === 'error'}>
                                Tool Output
                                {#if message.status === 'error'}
                                    - Error
                                {/if}
                            </span>
                            {#if message.status === 'error'}
                                <XCircle class="stroke-error-500" />
                            {:else if message.toolOutput}
                                <Check class="stroke-success-500" />
                            {:else if message.isStreaming}
                                <LoaderCircle class="stroke-warning-500 animate-spin" />
                            {:else}
                                <Diamond class="stroke-warning-500" />
                            {/if}
                        </div>
                    {/snippet}
                    {#snippet panel()}
                        <div class="max-w-full rounded-2xl p-2">
                            {#if message.status === 'error'}
                                <ToolError message={message} />
                            {:else if message.toolName === 'obp_requests'}
                                <ObpApiResponse message={message} />
                            {:else}
                                <DefaultToolResponse message={message} />
                            {/if}
                        </div>
                    {/snippet}
                </Accordion.Item>
            </Accordion>
        {/snippet}
    </Accordion.Item>
</Accordion>