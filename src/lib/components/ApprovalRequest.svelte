<script lang="ts">
	import type { ApprovalRequestMessage } from '$lib/opey/types';
	import { CheckCircle, XCircle, AlertTriangle } from '@lucide/svelte';

	interface Props {
		message: ApprovalRequestMessage;
		onApprove: (toolCallId: string) => Promise<void>;
		onDeny: (toolCallId: string) => Promise<void>;
	}

	// Function to get display name with instance number
	function getToolDisplayName(toolName: string, instanceNumber: number = 1): string {
		switch (toolName) {
			case 'retrieve_endpoints':
				return `Endpoint Retrieval - Finding API endpoints (${instanceNumber})`;
			case 'retrieve_glossary':
				return `Glossary Retrieval - Looking up terminology (${instanceNumber})`;
			default:
				return `${toolName} (${instanceNumber})`;
		}
	}

	let { message, onApprove, onDeny }: Props = $props();

	let isProcessing = $state(false);
	let hasResponded = $derived(message.approved !== undefined);

	async function handleApprove() {
		if (isProcessing || hasResponded) return;
		isProcessing = true;
		try {
			await onApprove(message.toolCallId);
		} finally {
			isProcessing = false;
		}
	}

	async function handleDeny() {
		if (isProcessing || hasResponded) return;
		isProcessing = true;
		try {
			await onDeny(message.toolCallId);
		} finally {
			isProcessing = false;
		}
	}

	function formatToolInput(input: Record<string, any>): string {
		return Object.entries(input)
			.map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
			.join(', ');
	}
</script>

<div class="card dark:bg-warning-500/10 bg-warning-50 border-warning-200 dark:border-warning-800 border p-4 rounded-lg">
	<div class="flex items-start gap-3">
		<div class="flex-shrink-0 mt-1">
			<AlertTriangle class="h-5 w-5 text-warning-600" />
		</div>
		
		<div class="flex-1 min-w-0">
			<div class="flex items-center gap-2 mb-2">
				<h4 class="text-sm font-semibold text-warning-800 dark:text-warning-200">
					Tool Approval Required
				</h4>
				{#if hasResponded}
					<div class="flex items-center gap-1">
						{#if message.approved}
							<CheckCircle class="h-4 w-4 text-success-600" />
							<span class="text-xs text-success-600 font-medium">Approved</span>
						{:else}
							<XCircle class="h-4 w-4 text-error-600" />
							<span class="text-xs text-error-600 font-medium">Denied</span>
						{/if}
					</div>
				{/if}
			</div>

			<div class="space-y-2 text-sm">
				<div>
					<span class="font-medium text-surface-700 dark:text-surface-300">Tool:</span>
					<span class="text-surface-600 dark:text-surface-400 ml-1">{getToolDisplayName(message.toolName, 1)}</span>
				</div>
				
				{#if message.description}
					<div>
						<span class="font-medium text-surface-700 dark:text-surface-300">Description:</span>
						<p class="text-surface-600 dark:text-surface-400 mt-1">{message.description}</p>
					</div>
				{/if}

				<div>
					<span class="font-medium text-surface-700 dark:text-surface-300">Parameters:</span>
					<div class="text-surface-600 dark:text-surface-400 mt-1 p-2 bg-surface-100 dark:bg-surface-800 rounded text-xs font-mono">
						{formatToolInput(message.toolInput)}
					</div>
				</div>
			</div>

			{#if !hasResponded}
				<div class="flex gap-2 mt-4">
					<button
						onclick={handleApprove}
						disabled={isProcessing}
						class="btn btn-sm preset-filled-success-500 hover:preset-filled-success-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						<CheckCircle class="h-4 w-4" />
						{isProcessing ? 'Processing...' : 'Approve'}
					</button>
					
					<button
						onclick={handleDeny}
						disabled={isProcessing}
						class="btn btn-sm preset-filled-error-500 hover:preset-filled-error-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						<XCircle class="h-4 w-4" />
						{isProcessing ? 'Processing...' : 'Deny'}
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>