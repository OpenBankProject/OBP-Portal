<script lang="ts">
	import type { ToolMessage } from '$lib/opey/types';
	import { createLogger } from '$lib/utils/logger';
	import { Shield, CheckCircle, XCircle, KeyRound, AlertTriangle, Loader2 } from '@lucide/svelte';

	const logger = createLogger('ConsentRequestCard');

	interface Props {
		toolMessage: ToolMessage;
		onConsent: (toolCallId: string, consentJwt: string) => Promise<void>;
		onDeny: (toolCallId: string) => Promise<void>;
	}

	let { toolMessage, onConsent, onDeny }: Props = $props();

	let isProcessing = $state(false);
	let consentError = $state<string | null>(null);

	/**
	 * Create a role-specific consent via the server-side API route,
	 * then pass the JWT back to the chat controller.
	 */
	async function handleGrantConsent() {
		if (isProcessing) return;
		isProcessing = true;
		consentError = null;

		try {
			// Normalize roles to strings (handle both string and object formats)
			const normalizedRoles = (toolMessage.consentRequiredRoles || []).map((role: any) => {
				if (typeof role === 'string') return role;
				// Handle object format: {role: "CanCreateBank", requires_bank_id: false}
				return role?.role || role?.role_name || role?.name || '';
			}).filter(Boolean);

			logger.info(`Creating consent with roles:`, normalizedRoles);
			logger.info(`Original roles from toolMessage:`, toolMessage.consentRequiredRoles);

			// Call our server-side API to create the consent at OBP
			const response = await fetch('/api/opey/consent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					required_roles: normalizedRoles
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Failed to create consent (HTTP ${response.status})`);
			}

			const data = await response.json();

			if (!data.consent_jwt) {
				throw new Error('No consent JWT returned from server');
			}

			logger.info(`Consent created successfully for tool ${toolMessage.toolCallId}`);

			// Send the JWT back to the chat controller
			await onConsent(toolMessage.toolCallId, data.consent_jwt);
		} catch (error) {
			logger.error('Failed to create consent:', error);
			consentError = error instanceof Error ? error.message : 'Failed to create consent';
		} finally {
			isProcessing = false;
		}
	}

	async function handleDenyConsent() {
		if (isProcessing) return;
		isProcessing = true;
		consentError = null;

		try {
			await onDeny(toolMessage.toolCallId);
		} finally {
			isProcessing = false;
		}
	}
</script>

<div class="card rounded-lg border-2 border-tertiary-500 p-4 bg-tertiary-50-950/10">
	<!-- Header -->
	<div class="mb-3 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<KeyRound class="text-tertiary-600 dark:text-tertiary-400" size={24} />
			<h3 class="text-lg font-semibold">Consent Required</h3>
		</div>
	</div>

	<!-- Explanation -->
	<p class="mb-3 text-sm text-surface-700 dark:text-surface-300">
		This operation requires additional permissions. You'll be granting a temporary, role-specific
		consent that authorizes this specific action.
	</p>

	<!-- Operation Info -->
	{#if toolMessage.consentOperationId}
		<div class="mb-3">
			<span class="text-sm font-medium">Operation:</span>
			<code class="ml-2 rounded bg-tertiary-100 px-2 py-1 text-sm dark:bg-tertiary-800">
				{toolMessage.consentOperationId}
			</code>
		</div>
	{/if}

	<!-- Tool Name -->
	<div class="mb-3">
		<span class="text-sm font-medium">Tool:</span>
		<code class="ml-2 rounded bg-primary-100 px-2 py-1 text-sm dark:bg-primary-800">
			{toolMessage.toolName}
		</code>
	</div>

	<!-- Required Roles -->
	{#if toolMessage.consentRequiredRoles && toolMessage.consentRequiredRoles.length > 0}
		<div class="mb-4">
			<h4 class="mb-2 text-sm font-medium">Required Permissions:</h4>
			<div class="flex flex-wrap gap-2">
				{#each toolMessage.consentRequiredRoles as role}
					{@const roleName = typeof role === 'string' ? role : (role?.role || role?.role_name || role?.name || JSON.stringify(role))}
					<span class="flex items-center gap-1 rounded-full bg-tertiary-100 px-3 py-1 text-xs font-medium dark:bg-tertiary-800">
						<Shield size={12} />
						{roleName}
					</span>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Security Notice -->
	<div class="mb-4 flex items-start gap-2 rounded bg-surface-200-800 p-3">
		<AlertTriangle class="mt-0.5 flex-shrink-0 text-warning-600 dark:text-warning-400" size={16} />
		<p class="text-xs text-surface-600 dark:text-surface-400">
			This consent is temporary (1 hour) and scoped only to the permissions listed above.
			The consent JWT is handled securely and never exposed to the AI model.
		</p>
	</div>

	<!-- Error Display -->
	{#if consentError}
		<div class="mb-3 rounded bg-error-50 p-3 text-sm text-error-700 dark:bg-error-900/30 dark:text-error-300">
			{consentError}
		</div>
	{/if}

	<!-- Action Buttons -->
	<div class="flex gap-3">
		<!-- Grant Consent Button -->
		<button
			class="btn flex-1 preset-filled-tertiary-500"
			onclick={handleGrantConsent}
			disabled={isProcessing}
		>
			{#if isProcessing}
				<Loader2 size={18} class="animate-spin" />
				<span>Creating consent...</span>
			{:else}
				<CheckCircle size={18} />
				<span>Grant Consent</span>
			{/if}
		</button>

		<!-- Deny Button -->
		<button
			class="btn flex-1 preset-outlined-error-500"
			onclick={handleDenyConsent}
			disabled={isProcessing}
		>
			<XCircle size={18} />
			<span>Deny</span>
		</button>
	</div>
</div>
