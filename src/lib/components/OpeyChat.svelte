<script lang="ts">
	import { onMount } from 'svelte';
	import { ShieldUserIcon } from '@lucide/svelte';
	import { Tooltip } from '@skeletonlabs/skeleton-svelte';

	// Function to format tool output with better user experience
	function formatToolOutput(message: ToolMessage): string {
		// Handle tool execution errors first
		if (message.status === 'error') {
			const errorOutput = message.toolOutput
				? typeof message.toolOutput === 'string'
					? message.toolOutput
					: JSON.stringify(message.toolOutput, null, 2)
				: 'Tool execution failed with no additional details';

			return `
				<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					<div class="font-bold">❌ Tool Execution Failed</div>
					<div class="text-sm mt-2">
						<strong>Tool:</strong> ${message.toolName}<br/>
						<strong>Error:</strong> ${errorOutput}
					</div>
				</div>
			`;
		}

		if (!message.toolOutput) {
			return '<div class="text-gray-500">No output available</div>';
		}

		// Handle OBP API responses specifically
		if (message.toolName === 'obp_requests') {
			try {
				const output =
					typeof message.toolOutput === 'string'
						? JSON.parse(message.toolOutput)
						: message.toolOutput;

				// Check if this is an error response
				if (output.error || output.message || (output.code && output.code !== 200)) {
					const errorCode = output.code || output.status || 'Unknown';
					const errorMessage = output.message || output.error || 'Unknown error';
					const errorDetail = output.error_message || output.detail || '';

					return `
						<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
							<div class="font-bold">❌ API Request Failed</div>
							<div class="text-sm mt-1">
								<strong>Status:</strong> ${errorCode}<br/>
								<strong>Message:</strong> ${errorMessage}
								${errorDetail ? `<br/><strong>Detail:</strong> ${errorDetail}` : ''}
							</div>
						</div>
					`;
				}

				// Success response
				if (output && typeof output === 'object') {
					// Format successful responses with key highlights
					let formatted =
						'<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">';
					formatted += '<div class="font-bold">✅ API Request Successful</div>';
					formatted += '<div class="text-sm mt-2">';

					// Extract key information
					if (output.bank_id) formatted += `<strong>Bank ID:</strong> ${output.bank_id}<br/>`;
					if (output.user_id) formatted += `<strong>User ID:</strong> ${output.user_id}<br/>`;
					if (output.account_id)
						formatted += `<strong>Account ID:</strong> ${output.account_id}<br/>`;
					if (output.transaction_id)
						formatted += `<strong>Transaction ID:</strong> ${output.transaction_id}<br/>`;
					if (output.banks && Array.isArray(output.banks)) {
						formatted += `<strong>Banks Found:</strong> ${output.banks.length}<br/>`;
					}
					if (output.accounts && Array.isArray(output.accounts)) {
						formatted += `<strong>Accounts Found:</strong> ${output.accounts.length}<br/>`;
					}

					formatted += '</div>';
					formatted +=
						'<details class="mt-2"><summary class="cursor-pointer text-xs text-green-600">View Full Response</summary>';
					formatted += `<pre class="text-xs mt-2 bg-green-50 p-2 rounded overflow-x-auto">${JSON.stringify(output, null, 2)}</pre>`;
					formatted += '</details>';
					formatted += '</div>';

					return formatted;
				}
			} catch (e) {
				// If JSON parsing fails, treat as plain text
			}
		}

		// Default formatting for other tools or plain text
		const outputStr =
			typeof message.toolOutput === 'string'
				? message.toolOutput
				: JSON.stringify(message.toolOutput, null, 2);

		return `<pre class="text-sm bg-gray-50 p-3 rounded overflow-x-auto">${outputStr}</pre>`;
	}
	import { env } from '$env/dynamic/public';
	import { CookieAuthStrategy } from '$lib/opey/services/AuthStrategy';
	import { ChatState, type ChatStateSnapshot } from '$lib/opey/state/ChatState';
	import { RestChatService } from '$lib/opey/services/RestChatService';
	import { ChatController } from '$lib/opey/controllers/ChatController';
	import { SessionState, type SessionSnapshot } from '$lib/opey/state/SessionState';
	import { ConsentSessionService } from '$lib/opey/services/ConsentSessionService';
	import type { ToolMessage, ApprovalRequestMessage } from '$lib/opey/types';
	import { Accordion, Avatar } from '@skeletonlabs/skeleton-svelte';
	import ApprovalRequest from './ApprovalRequest.svelte';
	import { healthCheckRegistry } from '$lib/health-check/HealthCheckRegistry';

	// Function to get display name with instance number
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
	import {
		Check,
		CircleArrowUp,
		Diamond,
		Hammer,
		LoaderCircle,
		XCircle,
		type Icon as IconType
	} from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import { renderMarkdown } from '$lib/markdown/helper-funcs';
	import { fly } from 'svelte/transition';

	// Interface for chat options
	export type SuggestedQuestion = {
		questionString: string; // the actual question that will be sent to the chatbot i.e. 'How do I authenticate?'
		pillTitle: string; // the title that will appear in the UI i.e 'Authentication'
		icon?: typeof IconType; // Optional, an icon to display in the pill
	};
	export interface OpeyChatOptions {
		baseUrl: string; // Base Opey URL
		displayHeader: boolean; // Whether to display the header with the logo and title
		currentlyActiveUserName: string; // Optional name of the currently active user
		suggestedQuestions: SuggestedQuestion[]; // List of suggested questions to display
		displayConnectionPips: boolean; // Whether to display connection status pips
		initialAssistantMessage?: string;
		headerClasses?: string; // Optional classes for the header
		footerClasses?: string;
		bodyClasses?: string;
	}
	interface Props {
		opeyChatOptions?: Partial<OpeyChatOptions>; // Optional chat options to customize the component
		userAuthenticated?: boolean; // Optional prop to indicate if the user is authenticated
		splash?: Snippet; // If set, will render the splash screen snippet until the first message is sent
		// upon which the splash screen will dissapear
	}
	// Default chat options
	const defaultChatOptions: OpeyChatOptions = {
		baseUrl: env.PUBLIC_OPEY_BASE_URL || 'http://localhost:5000',
		displayHeader: true,
		currentlyActiveUserName: 'Guest',
		displayConnectionPips: true,
		suggestedQuestions: []
	};

	let { opeyChatOptions, userAuthenticated = false, splash }: Props = $props();
	// Merge default options with the provided options
	const options = { ...defaultChatOptions, ...opeyChatOptions };

	// Initialize session state and services

	const sessionState = new SessionState();
	const sessionService = new ConsentSessionService(options.baseUrl);

	const chatState = new ChatState();
	const chatService = new RestChatService(options.baseUrl, new CookieAuthStrategy());
	const chatController = new ChatController(chatService, chatState);

	let session: SessionSnapshot = $state({ isAuthenticated: userAuthenticated, status: 'ready' });
	let chat: ChatStateSnapshot = $state({ threadId: '', messages: [] });

	// TODO: this is not quite working properly, returns unknown all the time
	let connectionStatus: 'healthy' | 'unhealthy' | 'degraded' | 'unknown' = $derived.by(() => {
		const snapshots = $state.snapshot(healthCheckRegistry.getStore());
		const opeySnapshot = snapshots['Opey II' as keyof typeof snapshots];

		if (!opeySnapshot) return 'unknown';
		if ('status' in opeySnapshot && opeySnapshot.status === 'degraded') return 'degraded';
		return (opeySnapshot && 'status' in opeySnapshot && opeySnapshot.status === 'healthy') ? 'healthy' : 'unhealthy';
	});

	let splashScreenDisplay = $derived.by(() => {
		return splash && chat.messages.length === 0;
	});

	onMount(async () => {
		console.debug('OpeyChat component mounted with options:', options);
		sessionState.subscribe((s) => (session = s));
		chatState.subscribe((c) => {
			if (c.messages.length > 0) {
				const toolMessages = c.messages.filter((m) => m.role === 'tool');
				toolMessages.forEach((tm, index) => {});
			}
			chat = c;
		});

		if (options.initialAssistantMessage) {
			chatState.addMessage({
				id: crypto.randomUUID(),
				role: 'assistant',
				message: options.initialAssistantMessage,
				timestamp: new Date()
			});
		}
		//

		await initializeOpeySession();

		//return unsubscribeFromHealthCheck
	});

	// Derived colors for pips
	let connectionPipColor: string = $derived.by(() => {
		switch (connectionStatus) {
			case 'healthy':
				return 'preset-filled-success-500';
			case 'unhealthy':
				return 'preset-filled-error-500';
			case 'degraded':
				return 'preset-filled-warning-500';
			case 'unknown':
				return 'preset-filled-warning-500';
			default:
				return 'preset-filled-warning-500';
		}
	});

	let connectionStatusString: string = $derived.by(() => {
		switch (connectionStatus) {
			case 'healthy':
				return 'connected';
			case 'unhealthy':
				return 'disconnected';
			case 'degraded':
				return 'degraded';
			case 'unknown':
				return 'unknown';
			default:
				return 'unknown';
		}
	});

	let authPipColor: string = $derived.by(() => {
		switch (session.status) {
			case 'ready':
				return 'preset-filled-success-500';
			case 'error':
				return 'preset-filled-error-500';
			case 'loading':
				return 'preset-filled-warning-500';
			default:
				return 'preset-filled-warning-500';
		}
	});

	async function sendMessage(text: string) {
		if (!text.trim()) return;
		await chatController.send(text);
	}

	function handleSendMessage(text: string) {
		if (!text.trim()) return;
		sendMessage(text);
		messageInput = '';
	}

	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSendMessage(messageInput);
		}
	}

	async function initializeOpeySession() {
		try {
			sessionState.setStatus('loading');

			const response = await fetch('/api/opey/auth', {
				method: 'POST',
				credentials: 'include'
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to initialize session');
			}

			console.debug('Opey session initialized:', data);
			if (data.error) {
				console.warn('Opey session initialization warning:', data.error);
			}

			// Update session state based on response
			sessionState.setAuth(data.authenticated);
			sessionState.setStatus('ready');
		} catch (error: any) {
			console.error('Failed to initialize Opey session:', error);
			sessionState.setStatus('error', error.message);
		}
	}

	/**
	 * Connect to banking data (upgrade from anonymous to authenticated)
	 */
	async function upgradeSession() {
		if (!userAuthenticated) {
			window.location.href = '/login/obp';
			return;
		}

		// Re-initialize session - this time with authentication
		await initializeOpeySession();
	}

	let messageInput = $state('');

	async function handleApprove(toolCallId: string) {
		await chatController.approveToolCall(toolCallId);
	}

	async function handleDeny(toolCallId: string) {
		await chatController.denyToolCall(toolCallId);
	}
</script>

{#snippet header()}
	{#if options.displayHeader}
		<header
			class="align-center preset-filled-secondary-300-700 flex flex-shrink-0 justify-between {options.bodyClasses ||
				''}"
		>
			<img src="/opey-logo-inv.png" alt="Opey Logo" class="mx-2 my-auto h-10 w-auto" />
			<h1 class="h4 p-2">Chat With Opey</h1>
		</header>
	{/if}
{/snippet}

{#snippet body()}
	<article class="h-full overflow-y-auto p-4 {options.bodyClasses || ''}">
		<div class="space-y-4">
			{#each chat.messages as message, index (`${message.id}-${index}`)}
				{#if message.role === 'user'}
					<div class="flex flex-col items-end justify-start">
						<div class="mb-2 flex items-center gap-2">
							<!-- if the last message was a user message, no need to draw another avatar -->
							{#if !(chat.messages[index - 1]?.role === 'user')}
								<p class="text-s font-bold">{options.currentlyActiveUserName}</p>
								<Avatar
									name={options.currentlyActiveUserName}
									classes="w-7 h-7 border p-1 bg-secondary-50 border-primary-500"
								/>
							{/if}
						</div>
						<div class="preset-filled-tertiary-500 max-w-3/5 rounded-2xl p-2 text-white">
							{message.message}
						</div>
					</div>
				{:else if message.role === 'assistant'}
					<div class="flex flex-col items-start justify-start">
						{#if !['tool', 'assistant'].includes(chat.messages[index - 1]?.role)}
							<div class="mb-2 flex items-center gap-2">
								<Avatar
									src="/opey-icon-white.png"
									name="opey"
									classes="w-7 h-7 border p-1 bg-secondary-500 border-primary-500"
								/>
								<p class="text-s font-bold">Opey</p>
							</div>
							<hr class="hr" />
						{/if}
						<div class="prose dark:prose-invert max-w-full rounded-2xl p-2 text-left">
							{@html renderMarkdown(message.message)}
						</div>
					</div>
				{:else if message.role === 'tool'}
					<!-- if the last message was a tool message, no need to draw another avatar -->
					{#if !['tool', 'assistant'].includes(chat.messages[index - 1]?.role)}
						<div class="mb-2 flex items-center gap-2">
							<Avatar
								src="/opey-icon-white.png"
								name="opey"
								classes="w-7 h-7 border p-1 bg-secondary-500 border-primary-500"
							/>
							<p class="text-s font-bold">Opey</p>
						</div>
						<hr class="hr" />
					{/if}
					<Accordion collapsible classes="max-w-full">
						<Accordion.Item value={message.id}>
							{#snippet lead()}<Hammer />{/snippet}
							{#snippet control()}
								<div class="flex justify-between">
									<span class:text-error-700={(message as ToolMessage).status === 'error'}>
										{getToolDisplayName(
											(message as ToolMessage).toolName,
											(message as ToolMessage).instanceNumber || 1
										)}
										{#if (message as ToolMessage).status === 'error'}
											- Failed
										{/if}
									</span>
									{#if (message as ToolMessage).status === 'error'}
										<XCircle class="stroke-error-500" />
									{:else if (message as ToolMessage).approvalStatus === 'approved'}
										<Check class="stroke-success-500" />
									{:else if (message as ToolMessage).approvalStatus === 'denied'}
										<XCircle class="stroke-error-500" />
									{:else if (message as ToolMessage).waitingForApproval}
										<Diamond class="stroke-warning-500" />
									{:else if message.isStreaming}
										<LoaderCircle class="stroke-warning-500 animate-spin" />
									{:else}
										<Check class="stroke-success-500" />
									{/if}
								</div>
							{/snippet}
							{#snippet panel()}
								<Accordion collapsible>
									<Accordion.Item value="input">
										{#snippet lead()}<Hammer />{/snippet}
										{#snippet control()}Tool Input{/snippet}
										{#snippet panel()}
											<div class="preset-filled-primary-500 max-w-3/5 rounded-2xl p-2 text-white">
												{JSON.stringify((message as ToolMessage).toolInput)}
											</div>
										{/snippet}
									</Accordion.Item>
									<Accordion.Item value="output" disabled={!!message.isStreaming}>
										{#snippet lead()}<Hammer />{/snippet}
										{#snippet control()}
											<div class="flex justify-between">
												<span class:text-error-700={(message as ToolMessage).status === 'error'}>
													Tool Output
													{#if (message as ToolMessage).status === 'error'}
														- Error
													{/if}
												</span>
												{#if (message as ToolMessage).status === 'error'}
													<XCircle class="stroke-error-500" />
												{:else if (message as ToolMessage).approvalStatus === 'approved'}
													<Check class="stroke-success-500" />
												{:else if (message as ToolMessage).approvalStatus === 'denied'}
													<XCircle class="stroke-error-500" />
												{:else if (message as ToolMessage).waitingForApproval}
													<Diamond class="stroke-warning-500" />
												{:else if message.isStreaming}
													<LoaderCircle class="stroke-warning-500 animate-spin" />
												{:else}
													<Check class="stroke-success-500" />
												{/if}
											</div>
										{/snippet}
										{#snippet panel()}
											<div class="preset-filled-primary-500 max-w-full rounded-2xl p-2 text-white">
												<div class="overflow-x-auto">
													{@html formatToolOutput(message as ToolMessage)}
												</div>
											</div>
										{/snippet}
									</Accordion.Item>
								</Accordion>
							{/snippet}
						</Accordion.Item>
					</Accordion>
				{:else if message.role === 'approval_request'}
					<div class="flex flex-col items-start justify-start">
						{#if !['tool', 'assistant', 'approval_request'].includes(chat.messages[index - 1]?.role)}
							<div class="mb-2 flex items-center gap-2">
								<Avatar
									src="/opey-icon-white.png"
									name="opey"
									classes="w-7 h-7 border p-1 bg-secondary-500 border-primary-500"
								/>
								<p class="text-s font-bold">Opey</p>
							</div>
							<hr class="hr" />
						{/if}
						<div class="max-w-full">
							<ApprovalRequest
								message={message as ApprovalRequestMessage}
								onApprove={handleApprove}
								onDeny={handleDeny}
							/>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</article>
{/snippet}

{#snippet suggestedQuestions()}
	{#if options.suggestedQuestions.length > 0 && chat.messages.length <= 1}
		<div class="flex flex-wrap justify-center gap-2 p-4">
			{#each options.suggestedQuestions as question}
				<button
					class="btn bg-primary-50-950 border-primary-500 text-s flex items-center rounded-lg border border-solid px-3"
					onclick={() => handleSendMessage(question.questionString)}
					disabled={session?.status !== 'ready'}
				>
					{#if question.icon}
						<question.icon />
					{/if}
					{question.pillTitle}
				</button>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet inputField()}
	<div class="flex w-full items-center gap-2">
		<!-- Use flex to align input and pips horizontally -->
		<div class="relative flex-1">
			<!-- Input container -->
			<img
				src="/opey_avatar.png"
				alt="Opey Avatar"
				class="absolute top-1/10 left-0 size-12 -translate-x-17 rounded-full drop-shadow-[-7px_7px_10px_var(--color-secondary-500)]"
			/>
			<input
				bind:value={messageInput}
				type="text"
				placeholder="Ask me about the Open Bank Project API"
				class="input bg-primary-50 dark:bg-primary-600 h-15 w-full rounded-lg p-5 pr-7"
				disabled={session?.status !== 'ready'}
				onkeydown={handleKeyPress}
			/>
			{#if messageInput.length > 0}
				<button
					class="btn btn-primary absolute top-1/2 right-1 -translate-y-1/2"
					disabled={session?.status !== 'ready' || !messageInput.trim()}
					onclick={() => handleSendMessage(messageInput)}
				>
					<CircleArrowUp class="h-7 w-7" />
				</button>
			{/if}
		</div>
		<!-- Pips outside the input, on the right -->
		<div class="flex flex-col gap-1">
			<!-- Connection Pip with Tooltip -->
			<Tooltip classes="z-10">
				<!-- Added z-10 for higher stacking -->
				{#snippet trigger()}
					<div class="badge-icon {connectionPipColor} h-3 w-3">
						<ShieldUserIcon size={12} />
					</div>
				{/snippet}
				{#snippet content()}Opey Connection Status: {connectionStatusString}{/snippet}
			</Tooltip>
			<!-- Authentication Pip with Tooltip -->
			<Tooltip classes="z-10">
				<!-- Added z-10 for higher stacking -->
				{#snippet trigger()}
					<div class="badge-icon {authPipColor} h-3 w-3">
						<ShieldUserIcon size={12} />
					</div>
				{/snippet}
				{#snippet content()}Authentication Status{/snippet}
			</Tooltip>
		</div>
	</div>
{/snippet}

<div class="flex h-full w-full flex-col">
	<!-- Header -->

	{#if !splashScreenDisplay && options.displayHeader}
		<div class="flex-shrink-0 {options.headerClasses || ''}">
			{@render header()}
		</div>
	{/if}

	<div class="flex min-h-0 flex-1 flex-col">
		{#if splashScreenDisplay && splash}
			<!-- Splash layout: centered content with input directly below -->
			<div class="flex flex-1 flex-col items-center justify-center space-y-6">
				{@render splash()}

				<div class="w-full max-w-3xl px-4 {options.footerClasses || ''} mb-0">
					{@render inputField()}
				</div>

				{@render suggestedQuestions()}
			</div>
		{:else}
			<!--Main Chat Layout: messages fill space, input at bottom-->
			<div class="flex-1 overflow-hidden">
				{@render body()}
			</div>

			{@render suggestedQuestions()}

			<div class="flex-shrink-0 p-4 {options.footerClasses || ''}">
				{@render inputField()}
			</div>
		{/if}
	</div>
</div>
