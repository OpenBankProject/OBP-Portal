<script lang="ts">
	import { onMount } from 'svelte';
	import { ShieldUserIcon } from '@lucide/svelte';
	import { Tooltip } from '@skeletonlabs/skeleton-svelte';
	import { createLogger } from '$lib/utils/logger';

	const logger = createLogger('OpeyChat');

	import { env } from '$env/dynamic/public';
	import { CookieAuthStrategy } from '$lib/opey/services/AuthStrategy';
	import { ChatState, type ChatStateSnapshot } from '$lib/opey/state/ChatState';
	import { RestChatService } from '$lib/opey/services/RestChatService';
	import { ChatController } from '$lib/opey/controllers/ChatController';
	import { SessionState, type SessionSnapshot } from '$lib/opey/state/SessionState';
	import { ConsentSessionService } from '$lib/opey/services/ConsentSessionService';
	import type { ToolMessage } from '$lib/opey/types';
	import type { OBPConsentInfo } from '$lib/obp/types';
	import { healthCheckRegistry } from '$lib/health-check/HealthCheckRegistry';

	// Import other components
	import { ToolError, ObpApiResponse, DefaultToolResponse } from './tool-messages';
	import ChatMessage from './ChatMessage.svelte';

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
		CircleArrowUp,
		type Icon as IconType
	} from '@lucide/svelte';
	import type { Snippet } from 'svelte';

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
		currentConsentInfo?: OBPConsentInfo; // Consent info for the status pip
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
		return opeySnapshot && 'status' in opeySnapshot && opeySnapshot.status === 'healthy'
			? 'healthy'
			: 'unhealthy';
	});

	let splashScreenDisplay = $derived.by(() => {
		return splash && chat.messages.length === 0;
	});

	onMount(async () => {
		logger.debug('OpeyChat component mounted with options:', options);
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

		// Can set retry parameters here if desired
		// e.g. await initializeOpeySessionWithRetry(5, 2000);
		// would try 5 times with a base delay of 2 seconds
		await initializeOpeySessionWithRetry();
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

	// async function formatAuthStatusPip(session: SessionSnapshot, consentInfo?: OBPConsentInfo): {
	// 	const 
	// }

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

			logger.debug('Opey session initialized:', data);
			if (data.error) {
				logger.warn('Opey session initialization warning:', data.error);
			}

			// Update session state based on response
			sessionState.setAuth(data.authenticated);
			sessionState.setStatus('ready');
		} catch (error: any) {
			logger.error('Failed to initialize Opey session:', error);
			sessionState.setStatus('error', error.message);
		}
	}

	// Add retry logic with exponential backoff
	async function initializeOpeySessionWithRetry(maxRetries = 3, baseDelay = 1000) {
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				await initializeOpeySession();
				if (session.status === 'ready') {
					logger.debug(`Opey session initialized successfully on attempt ${attempt}`);
					return;
				}
			} catch (error) {
				logger.warn(`Session initialization attempt ${attempt} failed:`, error);
			}

			if (attempt < maxRetries) {
				const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
				logger.debug(`Retrying session initialization in ${delay}ms...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		logger.error(`Failed to initialize session after ${maxRetries} attempts`);
		sessionState.setStatus('error', `Failed to initialize after ${maxRetries} attempts`);
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

{#snippet toolOutput(message: ToolMessage)}
	{#if message.status === 'error'}
		<ToolError {message} />
	{:else if message.toolName === 'obp_requests'}
		<ObpApiResponse {message} />
	{:else}
		<DefaultToolResponse {message} />
	{/if}
{/snippet}

{#snippet body()}
	<article class="h-full overflow-y-auto p-4 {options.bodyClasses || ''}">
		<div class="space-y-4">
			{#each chat.messages as message, index (message.id)}
				<ChatMessage
					{message}
					previousMessageRole={index > 0 ? chat.messages[index - 1].role : undefined}
					userName={options.currentlyActiveUserName}
					onApprove={handleApprove}
					onDeny={handleDeny}
				/>
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

{#snippet statusPips(session: SessionSnapshot, consentInfo?: OBPConsentInfo)}
	{#if options.displayConnectionPips}
		<div class="flex flex-col items-center">
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
				{#snippet content()}
					{#if session.status === 'loading'}
						Authenticating...
					{:else if session.status === 'error'}
						Error during authentication: {session.error}
					{:else if session.isAuthenticated}
						Authenticated
						{#if consentInfo}
							<br />
							Consent ID: {consentInfo.consent_id}
						{/if}
					{:else}
						Not Authenticated
					{/if}
				{/snippet}
			</Tooltip>
			<!-- {#if !session.isAuthenticated}
				<button class="btn btn-sm btn-primary" onclick={upgradeSession} disabled={session.status === 'loading'}>
					Log in to connect banking data
				</button>
			{/if} -->
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
			{@render statusPips(session, options.currentConsentInfo)}
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
