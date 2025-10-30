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
        CheckCircle,
    } from '@lucide/svelte';
	import ToolApprovalCard from '../ToolApprovalCard.svelte';
	    interface Props {
        message: ToolMessage;
        onApprove?: (toolCallId: string, approvalLevel?: string) => Promise<void>;
        onDeny?: (toolCallId: string) => Promise<void>;
        batchApprovalGroup?: ToolMessage[];  // Other tools in the same batch
        onBatchSubmit?: (decisions: Map<string, { approved: boolean; level: string }>) => Promise<void>;
    }
    
    let { message, onApprove, onDeny, batchApprovalGroup, onBatchSubmit }: Props = $props();
    
    // Check if this is part of a batch approval
    let isBatchApproval = $derived(!!batchApprovalGroup && batchApprovalGroup.length > 1);
    
    // Track batch decisions (only used if this is the first message in batch)
    let batchDecisions = $state(
        batchApprovalGroup
            ? new Map(
                batchApprovalGroup.map(tm => [
                    tm.toolCallId,
                    { approved: false, level: tm.defaultApprovalLevel || 'once' }
                ])
            )
            : new Map()
    );
    
    let isFirstInBatch = $derived(
        isBatchApproval && batchApprovalGroup?.[0]?.toolCallId === message.toolCallId
    );
    
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
    
    // Individual approval handlers
    async function handleApprove(toolCallId: string, approvalLevel?: string) {
        if (isProcessing || message.approvalStatus === 'approved') return;
        isProcessing = true;
        try {
            if (isBatchApproval) {
                // Update batch decision
                const level = approvalLevel || message.defaultApprovalLevel || 'once';
                batchDecisions.set(toolCallId, { approved: true, level });
                batchDecisions = new Map(batchDecisions);
            } else if (onApprove) {
                await onApprove(toolCallId, approvalLevel);
            }
        } finally {
            isProcessing = false;
        }
    }
    
    async function handleDeny(toolCallId: string) {
        if (isProcessing || message.approvalStatus === 'denied') return;
        isProcessing = true;
        try {
            if (isBatchApproval) {
                // Update batch decision
                batchDecisions.set(toolCallId, { approved: false, level: 'once' });
                batchDecisions = new Map(batchDecisions);
            } else if (onDeny) {
                await onDeny(toolCallId);
            }
        } finally {
            isProcessing = false;
        }
    }
    
    // Batch approval bulk actions
    function approveAll() {
        batchApprovalGroup?.forEach(tm => {
            batchDecisions.set(tm.toolCallId, { approved: true, level: tm.defaultApprovalLevel || 'once' });
        });
        batchDecisions = new Map(batchDecisions);
    }
    
    function denyAll() {
        batchApprovalGroup?.forEach(tm => {
            batchDecisions.set(tm.toolCallId, { approved: false, level: 'once' });
        });
        batchDecisions = new Map(batchDecisions);
    }
    
    function approveSafe() {
        batchApprovalGroup?.forEach(tm => {
            if (tm.riskLevel === 'low') {
                batchDecisions.set(tm.toolCallId, { approved: true, level: 'session' });
            }
        });
        batchDecisions = new Map(batchDecisions);
    }
    
    async function handleBatchSubmit() {
        if (isProcessing || !onBatchSubmit) return;
        isProcessing = true;
        try {
            await onBatchSubmit(batchDecisions);
        } finally {
            isProcessing = false;
        }
    }
    
    // Count batch decisions
    let approvedCount = $derived(
        Array.from(batchDecisions.values()).filter(d => d.approved).length
    );
    let deniedCount = $derived(
        batchApprovalGroup ? batchApprovalGroup.length - approvedCount : 0
    );
    let allDecisionsMade = $derived(
        batchApprovalGroup?.every(tm => {
            const decision = batchDecisions.get(tm.toolCallId);
            return decision && (decision.approved || !decision.approved);
        }) ?? false
    );
    
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

{#if isBatchApproval && isFirstInBatch}
    <!-- Batch Approval View -->
    <div class="card variant-ghost-warning rounded-lg border-2 border-warning-500 p-4 space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <AlertTriangle class="text-warning-600" size={24} />
                <div>
                    <h3 class="text-lg font-semibold">Multiple Approvals Required</h3>
                    <p class="text-sm text-surface-600 dark:text-surface-400">
                        {batchApprovalGroup?.length || 0} operations pending approval
                    </p>
                </div>
            </div>
            <div class="flex gap-2 text-sm">
                <span class="rounded-full bg-success-100 px-3 py-1 dark:bg-success-900">
                    ✓ {approvedCount}
                </span>
                <span class="rounded-full bg-error-100 px-3 py-1 dark:bg-error-900">
                    ✗ {deniedCount}
                </span>
            </div>
        </div>

        <!-- Bulk Actions -->
        <div class="flex gap-2">
            <button class="btn variant-filled-success btn-sm" onclick={approveAll}>
                <CheckCircle size={16} />
                Approve All
            </button>
            <button class="btn variant-filled-error btn-sm" onclick={denyAll}>
                <XCircle size={16} />
                Deny All
            </button>
            <button class="btn variant-filled-primary btn-sm" onclick={approveSafe}>
                <Check size={16} />
                Approve Low-Risk
            </button>
        </div>

        <!-- Individual Approvals -->
        <div class="space-y-3">
            {#each batchApprovalGroup || [] as toolMsg (toolMsg.toolCallId)}
                {@const decision = batchDecisions.get(toolMsg.toolCallId)}
                {@const hasDecision = decision && (decision.approved !== undefined)}
                
                {#if !hasDecision}
                    <!-- Pending approval -->
                    <ToolApprovalCard
                        toolMessage={toolMsg}
                        onApprove={handleApprove}
                        onDeny={handleDeny}
                    />
                {:else if decision.approved}
                    <!-- Approved -->
                    <div class="card variant-ghost-success rounded-lg border-2 border-success-500 p-3">
                        <div class="flex items-center gap-3">
                            <CheckCircle class="text-success-600" size={20} />
                            <div class="flex-1">
                                <div class="font-semibold text-sm">{toolMsg.toolName}</div>
                                <div class="text-xs text-surface-600 dark:text-surface-400">
                                    Approved ({decision.level})
                                </div>
                            </div>
                        </div>
                    </div>
                {:else}
                    <!-- Denied -->
                    <div class="card variant-ghost-error rounded-lg border-2 border-error-500 p-3">
                        <div class="flex items-center gap-3">
                            <XCircle class="text-error-600" size={20} />
                            <div class="flex-1">
                                <div class="font-semibold text-sm">{toolMsg.toolName}</div>
                                <div class="text-xs text-surface-600 dark:text-surface-400">
                                    Denied
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}
            {/each}
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end">
            <button
                class="btn variant-filled-primary"
                onclick={handleBatchSubmit}
                disabled={!allDecisionsMade || isProcessing}
            >
                {#if isProcessing}
                    <span class="animate-pulse">Submitting...</span>
                {:else if !allDecisionsMade}
                    Review All First
                {:else}
                    Submit All Decisions
                {/if}
            </button>
        </div>
    </div>
{:else if isBatchApproval}
    <!-- This is part of a batch but not the first - don't render, it's shown above -->
{:else}
    <!-- Single Tool Approval (Original) -->
<Accordion 
    collapsible 
    class="max-w-full" 
    value={mainAccordionValue} 
    onValueChange={(details: any) => (mainAccordionValue = details.value)}
>
    <Accordion.Item value={message.id}>
        <h3>
            <Accordion.ItemTrigger class="flex items-center justify-between gap-2 w-full">
                <div class="flex items-center gap-2">
                    <Hammer />
                    <span class:text-error-700={message.status === 'error'}>
                        {getToolDisplayName(
                            message.toolName,
                            message.instanceNumber || 1
                        )}
                        {#if message.status === 'error'}
                            - Failed
                        {/if}
                    </span>
                </div>
                {@const StatusIcon = statusIcon}
                <StatusIcon class={statusClass} />
            </Accordion.ItemTrigger>
        </h3>
        <Accordion.ItemContent>
            <!-- Tool Status -->
            <div class="mb-2 flex justify-between">
                <span class="text-sm font-medium">Status: {statusDisplay}</span>
            </div>
            
            <!-- Approval Interface - Shown only when waiting for approval -->
            {#if showApprovalInterface}
                <ToolApprovalCard
                    toolMessage={message}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                />
            {/if}
            
            <!-- Tool Input/Output Sections -->
            <Accordion 
                collapsible 
                value={nestedAccordionValue}
                onValueChange={(details: any) => (nestedAccordionValue = details.value)}
            >
                <Accordion.Item value="input">
                    <h4>
                        <Accordion.ItemTrigger class="flex items-center gap-2">
                            <Hammer />
                            <span>Tool Input</span>
                        </Accordion.ItemTrigger>
                    </h4>
                    <Accordion.ItemContent>
                        <div class="preset-filled-primary-500 max-w-full rounded-2xl p-2 text-white">
                            <pre class="overflow-x-auto text-xs">{JSON.stringify(message.toolInput, null, 2)}</pre>
                        </div>
                    </Accordion.ItemContent>
                </Accordion.Item>
                
                <Accordion.Item value="output" disabled={!!message.isStreaming && !message.toolOutput}>
                    <h4>
                        <Accordion.ItemTrigger class="flex items-center justify-between gap-2 w-full">
                            <div class="flex items-center gap-2">
                                <Hammer />
                                <span class:text-error-700={message.status === 'error'}>
                                    Tool Output
                                    {#if message.status === 'error'}
                                        - Error
                                    {/if}
                                </span>
                            </div>
                            <div>
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
                        </Accordion.ItemTrigger>
                    </h4>
                    <Accordion.ItemContent>
                        <div class="max-w-full rounded-2xl p-2">
                            {#if message.status === 'error'}
                                <ToolError message={message} />
                            {:else if message.toolName === 'obp_requests'}
                                <ObpApiResponse message={message} />
                            {:else}
                                <DefaultToolResponse message={message} />
                            {/if}
                        </div>
                    </Accordion.ItemContent>
                </Accordion.Item>
            </Accordion>
        </Accordion.ItemContent>
    </Accordion.Item>
</Accordion>
{/if}