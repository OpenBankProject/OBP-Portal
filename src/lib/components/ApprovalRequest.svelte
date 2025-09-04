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

<div
	class="card dark:bg-warning-500/10 bg-warning-50 border-warning-200 dark:border-warning-800 rounded-lg border p-4"
>
	<div class="flex items-start gap-3">
		<div class="mt-1 flex-shrink-0">
			{#if hasResponded}
				{#if message.approved}
					<CheckCircle class="text-success-600 h-5 w-5" />
				{:else}
					<XCircle class="text-error-600 h-5 w-5" />
				{/if}
			{:else}
				<AlertTriangle class="text-warning-600 h-5 w-5" />
			{/if}
		</div>

		<div class="min-w-0 flex-1">
			<div class="mb-2 flex items-center gap-2">
				<h4 class="text-warning-800 dark:text-warning-200 text-sm font-semibold">
					{#if hasResponded}
						Tool Approval
					{:else}
						Tool Approval Required
					{/if}
				</h4>
				{#if hasResponded}
					<div class="flex items-center gap-1">
						{#if message.approved}
							<CheckCircle class="text-success-600 h-4 w-4" />
							<span class="text-success-600 text-xs font-medium">Approved</span>
						{:else}
							<XCircle class="text-error-600 h-4 w-4" />
							<span class="text-error-600 text-xs font-medium">Denied</span>
						{/if}
					</div>
				{/if}
			</div>

			<div class="space-y-2 text-sm">
				<div>
					<span class="text-surface-700 dark:text-surface-300 font-medium">Tool:</span>
					<span class="text-surface-600 dark:text-surface-400 ml-1"
						>{getToolDisplayName(message.toolName, 1)}</span
					>
				</div>

				{#if message.description}
					<div>
						<span class="text-surface-700 dark:text-surface-300 font-medium">Description:</span>
						<p class="text-surface-600 dark:text-surface-400 mt-1">{message.description}</p>
					</div>
				{/if}

				<div>
					<span class="text-surface-700 dark:text-surface-300 font-medium">Parameters:</span>
					<div
						class="text-surface-600 dark:text-surface-400 bg-surface-100 dark:bg-surface-800 mt-1 rounded p-2 font-mono text-xs"
					>
						{formatToolInput(message.toolInput)}
					</div>
				</div>
			</div>

			{#if !hasResponded}
				<div class="mt-4 flex gap-2">
					<button
						onclick={handleApprove}
						disabled={isProcessing}
						class="btn btn-sm preset-filled-success-500 hover:preset-filled-success-600 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<CheckCircle class="h-4 w-4" />
						{isProcessing ? 'Processing...' : 'Approve'}
					</button>

					<button
						onclick={handleDeny}
						disabled={isProcessing}
						class="btn btn-sm preset-filled-error-500 hover:preset-filled-error-600 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<XCircle class="h-4 w-4" />
						{isProcessing ? 'Processing...' : 'Deny'}
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>
