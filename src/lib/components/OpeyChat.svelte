<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ShieldUserIcon } from '@lucide/svelte';
	import { Tooltip, Dialog, Portal } from '@skeletonlabs/skeleton-svelte';
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
	import { CircleArrowUp, StopCircle, type Icon as IconType } from '@lucide/svelte';
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

	// Track pending approvals for batch handling
	let pendingApprovalTools = $derived.by(() => {
		return chat.messages.filter(
			(m) => m.role === 'tool' && (m as ToolMessage).waitingForApproval
		) as ToolMessage[];
	});

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

	// Check if any message is currently streaming
	let isCurrentlyStreaming = $derived.by(() => {
		return chat.messages.some((msg) => msg.isStreaming);
	});

	// Auto-scroll management
	let messagesContainer: HTMLElement | null = $state(null);
	let userHasScrolledUp = $state(false);
	let isAutoScrollEnabled = $state(true);

	// Function to scroll to bottom
	function scrollToBottom() {
		if (messagesContainer && isAutoScrollEnabled) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	// Detect if user has scrolled up manually
	function handleScroll(event: Event) {
		if (!messagesContainer) return;

		const element = event.target as HTMLElement;
		const isAtBottom =
			Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 10;

		// If user scrolls to bottom, re-enable auto-scroll
		if (isAtBottom) {
			userHasScrolledUp = false;
			isAutoScrollEnabled = true;
		} else {
			// User has scrolled up
			userHasScrolledUp = true;
			isAutoScrollEnabled = false;
		}
	}

	async function getMermaidDiagram() {
		try {
			const response = await fetch(`${options.baseUrl}/mermaid_diagram`, {
				method: 'GET',
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch diagram: ${response.statusText}`);
			}

			const blob = await response.blob();
			return URL.createObjectURL(blob); // Returns a blob URL you can use in <img src={...}>
		} catch (error) {
			logger.error('Failed to get Mermaid diagram:', error);
			throw error;
		}
	}

	let diagramUrl = $state<string | null>(null);
	let isLoadingDiagram = $state(false);
	let diagramError = $state<string | null>(null);

	async function loadDiagram() {
		if (diagramUrl || isLoadingDiagram) return; // Already loaded or loading

		isLoadingDiagram = true;
		diagramError = null;
		try {
			diagramUrl = await getMermaidDiagram();
		} catch (error) {
			logger.error('Failed to load diagram:', error);
			diagramError = error instanceof Error ? error.message : 'Failed to load diagram';
		} finally {
			isLoadingDiagram = false;
		}
	}

	// Clean up blob URL when component is destroyed
	onDestroy(() => {
		if (diagramUrl) {
			URL.revokeObjectURL(diagramUrl);
		}
	});

	// Watch for message changes and auto-scroll
	$effect(() => {
		// Trigger on messages change
		chat.messages;

		// Only auto-scroll if enabled and streaming is happening
		if (isAutoScrollEnabled && (isCurrentlyStreaming || chat.messages.some((m) => m.isLoading))) {
			// Use requestAnimationFrame to ensure DOM has updated
			requestAnimationFrame(() => {
				scrollToBottom();
			});
		}
	});

	onMount(async () => {
		logger.debug('OpeyChat component mounted with options:', options);
		sessionState.subscribe((s) => (session = s));
		chatState.subscribe((c) => {
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

	let authPipOpenState = $state(false);

	// async function formatAuthStatusPip(session: SessionSnapshot, consentInfo?: OBPConsentInfo): {
	// 	const
	// }

	async function sendMessage(text: string) {
		if (!text.trim()) return;
		await chatController.send(text);
	}

	function handleSendMessage(text: string) {
		if (!text.trim()) return;

		// Re-enable auto-scroll when user sends a message
		isAutoScrollEnabled = true;
		userHasScrolledUp = false;

		sendMessage(text);
		messageInput = '';
	}

	function handleKeyPress(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault(); // Prevent newline
			handleSendMessage(messageInput);
		}
	}

	async function handleStopStreaming() {
		logger.debug('User requested to stop streaming');
		await chatController.stop();
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
			window.location.href = '/login';
			return;
		}

		// Re-initialize session - this time with authentication
		await initializeOpeySession();
	}

	// Track if the input is multiline (due to either wrapping or newlines)
	let isMultiline = $state(false);
	let messageInput = $state('');

	function autoResize(event: Event) {
		const textarea = event.target as HTMLTextAreaElement;
		textarea.style.height = 'auto'; // Reset height
		textarea.style.height = `${textarea.scrollHeight}px`; // Set to scrollHeight

		// Check if content exceeds a single line (approximately)
		// We compare scrollHeight to a typical single-line height
		const singleLineHeight = 50; // Adjust based on your font size and padding
		isMultiline = textarea.scrollHeight > singleLineHeight * 1.5;
	}

	async function handleApprove(toolCallId: string, approvalLevel?: string) {
		await chatController.approveToolCall(toolCallId, approvalLevel);
	}

	async function handleDeny(toolCallId: string) {
		await chatController.denyToolCall(toolCallId);
	}

	async function handleBatchApprovalSubmit(
		decisions: Map<string, { approved: boolean; level: string }>
	) {
		await chatController.submitBatchApproval(decisions);
	}

	async function handleRegenerate(messageId: string) {
		logger.debug(`Regenerating from message: ${messageId}`);
		// Re-enable auto-scroll when regenerating
		isAutoScrollEnabled = true;
		userHasScrolledUp = false;
		await chatController.regenerate(messageId);
	}

	// TEMPORARY: Test function to manually trigger a single approval message
	function addTestApprovalMessage() {
		chatState.addApprovalRequest(
			'test-tool-call-123',
			'test_api_call',
			{ endpoint: '/accounts', method: 'POST' },
			'Test approval request - checking dropdown functionality',
			{
				riskLevel: 'medium',
				affectedResources: ['Account 123', 'Transaction ABC'],
				reversible: true,
				estimatedImpact: 'This will modify 2 resources in the test environment',
				similarOperationsCount: 5,
				availableApprovalLevels: ['once', 'session', 'user'],
				defaultApprovalLevel: 'once'
			}
		);
	}

	// TEMPORARY: Test function to manually trigger batch approval (3 tools)
	function addTestBatchApprovalMessage() {
		chatState.addBatchApprovalRequest([
			{
				toolCallId: 'batch-test-1',
				toolName: 'obp_requests',
				toolInput: { endpoint: '/obp/v5.1.0/banks/gh.29.uk/accounts', method: 'POST' },
				message: 'Create a new bank account',
				riskLevel: 'moderate',
				affectedResources: ['Bank gh.29.uk'],
				reversible: false,
				estimatedImpact: 'This will create a new account in the production database',
				similarOperationsCount: 3,
				availableApprovalLevels: ['once', 'session'],
				defaultApprovalLevel: 'once'
			},
			{
				toolCallId: 'batch-test-2',
				toolName: 'obp_requests',
				toolInput: { endpoint: '/obp/v5.1.0/accounts/123', method: 'DELETE' },
				message: 'Delete an existing account',
				riskLevel: 'dangerous',
				affectedResources: ['Account 123', 'Associated Transactions'],
				reversible: false,
				estimatedImpact: 'This will permanently delete account 123 and all associated data',
				similarOperationsCount: 0,
				availableApprovalLevels: ['once'],
				defaultApprovalLevel: 'once'
			},
			{
				toolCallId: 'batch-test-3',
				toolName: 'obp_requests',
				toolInput: { endpoint: '/obp/v5.1.0/accounts', method: 'GET' },
				message: 'Retrieve account list',
				riskLevel: 'low',
				affectedResources: [],
				reversible: true,
				estimatedImpact: 'Read-only operation, no data will be modified',
				similarOperationsCount: 15,
				availableApprovalLevels: ['once', 'session', 'user'],
				defaultApprovalLevel: 'session'
			}
		]);
	}

	// TEMPORARY: Expose test functions globally for debugging
	if (typeof window !== 'undefined') {
		(window as any).addTestApprovalMessage = addTestApprovalMessage;
		(window as any).addTestBatchApprovalMessage = addTestBatchApprovalMessage;
	}
</script>

{#snippet header()}
	{#if options.displayHeader}
		<header
			class="align-center flex flex-shrink-0 justify-between preset-filled-secondary-300-700 {options.bodyClasses ||
				''}"
		>
			<img src="/opey-logo-inv.png" alt="Opey Logo" class="mx-2 my-auto h-10 w-auto" />
			<h1 class="p-2 h4">Chat With Opey</h1>
			<!-- TEMPORARY: Test buttons for approval system -->
			<div class="mx-2 flex gap-2">
				<button class="variant-filled-warning btn btn-sm" onclick={addTestApprovalMessage}>
					Test Single
				</button>
				<button class="variant-filled-error btn btn-sm" onclick={addTestBatchApprovalMessage}>
					Test Batch
				</button>
			</div>
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
	<article
		bind:this={messagesContainer}
		onscroll={handleScroll}
		class="h-full overflow-y-auto p-4 {options.bodyClasses || ''}"
	>
		<div class="space-y-4">
			{#each chat.messages as message, index (message.id)}
				<ChatMessage
					{message}
					previousMessageRole={index > 0 ? chat.messages[index - 1].role : undefined}
					userName={options.currentlyActiveUserName}
					onApprove={handleApprove}
					onDeny={handleDeny}
					onBatchSubmit={handleBatchApprovalSubmit}
					onRegenerate={handleRegenerate}
					batchApprovalGroup={pendingApprovalTools.length > 1 ? pendingApprovalTools : undefined}
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
					class="text-s btn flex items-center rounded-lg border border-solid border-primary-500 bg-primary-50-950 px-3"
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
			<Tooltip
				classes="z-10"
				positioning={{ placement: 'top' }}
				contentBase="card bg-primary-200-800 text-xs p-1"
				arrowBackground="var(--color-primary-200-800)"
				arrow
			>
				<!-- Added z-10 for higher stacking -->
				{#snippet trigger()}
					<div class="badge-icon {connectionPipColor} h-3 w-3">
						<ShieldUserIcon size={12} />
					</div>
				{/snippet}
				{#snippet content()}Opey Connection Status: {connectionStatusString}{/snippet}
			</Tooltip>
			<!-- Authentication Pip with Tooltip -->
			<Tooltip
				classes="z-10"
				open={authPipOpenState}
				contentBase="card bg-primary-200-800 text-xs p-1"
				arrowBackground="var(--color-primary-200-800)"
				onclick={() => {
					authPipOpenState = !authPipOpenState;
				}}
				arrow
			>
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
						<h1 class="font-bold text-success-500">Authenticated</h1>
						{#if consentInfo}
							<br />
							Consent ID:
							<a href="/user#opey-consent" aria-label="view opey consent"
								>{consentInfo.consent_id}</a
							>
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
	<!-- Single unified container for input and controls -->
	<div class="relative w-full rounded-lg bg-primary-50 dark:bg-primary-600">
		<!-- Avatar positioned outside the unified container - clickable easter egg! -->
		<Dialog onOpenChange={(details) => { if (details.open) loadDiagram(); }}>
			<Dialog.Trigger
				class="absolute top-1/10 left-0 size-12 -translate-x-17 rounded-full drop-shadow-[-7px_7px_10px_var(--color-secondary-500)] transition-transform hover:scale-110 cursor-pointer"
				title="Click me for a surprise!"
				aria-label="View Opey system diagram"
			>
				<img
					src="/opey_avatar.png"
					alt="Opey Avatar"
					class="w-full h-full rounded-full"
				/>
			</Dialog.Trigger>
			<Portal>
				<Dialog.Backdrop class="fixed inset-0 z-50 bg-surface-50-950/50" />
				<Dialog.Positioner class="fixed inset-0 z-50 flex justify-center items-center p-4">
					<Dialog.Content class="card bg-surface-100-900 w-full max-w-4xl p-6 space-y-4 shadow-xl">
						<header class="flex justify-between items-center">
							<Dialog.Title class="text-2xl font-bold">🎉 Opey System Architecture</Dialog.Title>
							<Dialog.CloseTrigger class="btn-icon preset-tonal">✕</Dialog.CloseTrigger>
						</header>
						<Dialog.Description class="text-sm opacity-75">
							Here's a behind-the-scenes look at how Opey works!
						</Dialog.Description>
						
						<div class="min-h-64 flex items-center justify-center">
							{#if isLoadingDiagram}
								<div class="flex flex-col items-center gap-4">
									<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
									<p class="text-sm opacity-75">Loading diagram...</p>
								</div>
							{:else if diagramError}
								<div class="text-center space-y-2">
									<p class="text-error-500">😔 Failed to load diagram</p>
									<p class="text-sm opacity-75">{diagramError}</p>
								</div>
							{:else if diagramUrl}
								<img 
									src={diagramUrl} 
									alt="Opey System Architecture Diagram" 
									class="w-full h-auto rounded-container"
								/>
							{/if}
						</div>
					</Dialog.Content>
				</Dialog.Positioner>
			</Portal>
		</Dialog>

		<!-- Text area - no bottom border radius when expanded -->
		<textarea
			bind:value={messageInput}
			placeholder={chat.messages.length > 0
				? 'Ask me about the Open Bank Project API'
				: 'Ask me anything...'}
			class="input min-h-15 w-full resize-none overflow-hidden border-none bg-transparent p-5 pr-7 outline-none focus:outline-none
				{isMultiline ? 'mb-0 rounded-t-lg' : 'rounded-lg'}"
			disabled={session?.status !== 'ready'}
			onkeydown={handleKeyPress}
			oninput={autoResize}
			rows="1"
		></textarea>

		<!-- Single-line mode controls -->
		{#if messageInput.length > 0 && !isMultiline}
			{#if isCurrentlyStreaming}
				<button
					class="absolute top-1/2 right-1 btn -translate-y-1/2 preset-filled-error-500"
					onclick={handleStopStreaming}
					title="Stop generation"
				>
					<StopCircle class="h-7 w-7" />
				</button>
			{:else}
				<button
					class="btn-primary absolute top-1/2 right-1 btn -translate-y-1/2"
					disabled={session?.status !== 'ready' || !messageInput.trim()}
					onclick={() => handleSendMessage(messageInput)}
				>
					<CircleArrowUp class="h-7 w-7" />
				</button>
			{/if}
		{:else if messageInput.length === 0}
			{#if isCurrentlyStreaming}
				<button
					class="btn-primary absolute top-1/2 right-3 btn -translate-y-1/2"
					onclick={handleStopStreaming}
					title="Stop generation"
				>
					<StopCircle class="h-7 w-7" />
				</button>
			{:else}
				<!-- When empty, show pips inline -->
				<div class="absolute top-1/2 right-3 -translate-y-1/2">
					{@render statusPips(session, options.currentConsentInfo)}
				</div>
			{/if}
		{/if}

		<!-- Footer - visually connected to textarea when multiline -->
		{#if isMultiline}
			<div
				class="flex w-full items-center justify-between rounded-b-lg bg-primary-50 p-2 pt-0 dark:bg-primary-600"
			>
				<div>
					<!-- Placeholder for future buttons (like file upload) -->
					<!-- <button class="btn variant-ghost-primary">Add File +</button> -->
				</div>

				<div class="flex items-center gap-2">
					{#if isCurrentlyStreaming}
						<button class="btn-primary btn" onclick={handleStopStreaming} title="Stop generation">
							<StopCircle class="h-7 w-7" />
						</button>
					{:else}
						<button
							class="btn-primary btn"
							disabled={session?.status !== 'ready' || !messageInput.trim()}
							onclick={() => handleSendMessage(messageInput)}
						>
							<CircleArrowUp class="h-7 w-7" />
						</button>
					{/if}

					{@render statusPips(session, options.currentConsentInfo)}
				</div>
			</div>
		{/if}
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
