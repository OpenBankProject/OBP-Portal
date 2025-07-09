<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { CookieAuthStrategy } from '$lib/opey/services/AuthStrategy';
	import { ChatState, type ChatStateSnapshot } from '$lib/opey/state/ChatState';
	import { RestChatService } from '$lib/opey/services/RestChatService';
	import { ChatController } from '$lib/opey/controllers/ChatController';
	import { SessionState, type SessionSnapshot } from '$lib/opey/state/SessionState';
	import { ConsentSessionService } from '$lib/opey/services/ConsentSessionService';
	import type { ToolMessage } from '$lib/opey/types';
	import { Accordion, Avatar } from '@skeletonlabs/skeleton-svelte';
	import { Check, CircleArrowUp, Hammer, LoaderCircle, type Icon as IconType } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import { renderMarkdown } from '$lib/markdown/helper-funcs';

	// Interface for chat options
	export type SuggestedQuestion = {
		questionString: string, // the actual question that will be sent to the chatbot i.e. 'How do I authenticate?'
		pillTitle: string, // the title that will appear in the UI i.e 'Authentication'
		icon?: typeof IconType // Optional, an icon to display in the pill
	}
	export interface OpeyChatOptions {
		baseUrl: string; // Base Opey URL
		displayHeader: boolean; // Whether to display the header with the logo and title
		currentlyActiveUserName: string; // Optional name of the currently active user
		suggestedQuestions: SuggestedQuestion[]; // List of suggested questions to display
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
		baseUrl: 'http://localhost:5000',
		displayHeader: true,
		currentlyActiveUserName: 'Guest',
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
	let isConnecting = false;

	let splashScreenDisplay = $derived.by(() => {
		return splash && chat.messages.length === 0;
	});

	onMount(async () => {
		console.debug('OpeyChat component mounted with options:', options);
		sessionState.subscribe((s) => (session = s));
		chatState.subscribe((c) => (chat = c));

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
	});

	async function sendMessage(text: string) {
		if (!text.trim()) return;
		await chatController.send(text);
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
	<article class="flex-1 space-y-4 overflow-auto p-4 {options.bodyClasses || ''}">
		<div class="space-y-2">
			{#each chat.messages as message (message.id)}
				{#if message.role === 'user'}
					<div class="flex flex-col items-end justify-start">
						<div class="mb-2 flex items-center gap-2">
							<p class="text-s font-bold">{options.currentlyActiveUserName}</p>
							<Avatar
								name={options.currentlyActiveUserName}
								classes="w-7 h-7 border p-1 bg-secondary-50 border-primary-500"
							/>
						</div>
						<div class="preset-filled-tertiary-500 max-w-3/5 rounded-2xl p-2 text-white">
							{message.message}
						</div>
					</div>
				{:else if message.role === 'assistant'}
					<div class="flex flex-col items-start justify-start">
						<div class="mb-2 flex items-center gap-2">
							<Avatar
								src="/opey-icon-white.png"
								name="opey"
								classes="w-7 h-7 border p-1 bg-secondary-50 border-primary-500"
							/>
							<p class="text-s font-bold">Opey</p>
						</div>
						<div
							class="prose dark:prose-invert preset-filled-secondary-50-950 max-w-3/5 rounded-2xl p-2 text-left"
						>
							{@html renderMarkdown(message.message)}
						</div>
					</div>
				{:else if message.role === 'tool'}
					<Accordion collapsible classes="max-w-3/5">
						<Accordion.Item value={message.id}>
							{#snippet lead()}<Hammer />{/snippet}
							{#snippet control()}
								<div class="flex justify-between">
									Using tool: {(message as ToolMessage).toolName}
									{#if message.isStreaming}
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
											<div class="preset-filled-secondary-500 max-w-3/5 rounded-2xl p-2 text-white">
												{JSON.stringify((message as ToolMessage).toolInput)}
											</div>
										{/snippet}
									</Accordion.Item>
									<Accordion.Item value="output" disabled={!!message.isStreaming}>
										{#snippet lead()}<Hammer />{/snippet}
										{#snippet control()}
											<div class="flex justify-between">
												Tool Output
												{#if message.isStreaming}
													<LoaderCircle class="stroke-warning-500 animate-spin" />
												{:else}
													<Check class="stroke-success-500" />
												{/if}
											</div>
										{/snippet}
										{#snippet panel()}
											<div class="preset-filled-secondary-500 max-w-3/5 rounded-2xl p-2 text-white">
												<strong>Tool Output:</strong>
												{JSON.stringify((message as ToolMessage).toolOutput)
													? JSON.stringify((message as ToolMessage).toolOutput)
													: 'No output available'}
											</div>
										{/snippet}
									</Accordion.Item>
								</Accordion>
							{/snippet}
						</Accordion.Item>
					</Accordion>
				{/if}
			{/each}
		</div>
	</article>
{/snippet}

{#snippet footer()}
	<footer class="w-full p-4 {options.footerClasses || ''}">
		<div class="relative">
			<input
				bind:value={messageInput}
				type="text"
				placeholder={session?.isAuthenticated
					? 'Ask about your banking...'
					: 'Connect your banking data to start chatting'}
				class="input bg-primary-400-600 rounded-lg h-15 flex-1 pr-10"
				disabled={session?.status !== 'ready'}
				onkeydown={(e) => e.key === 'Enter' && sendMessage(messageInput) && (messageInput = '')}
			/>
			{#if messageInput.length > 0}
				<button
					class="btn btn-primary absolute top-1/2 right-3 -translate-y-1/2 "
					disabled={session?.status !== 'ready' || !messageInput.trim()}
					onclick={() => sendMessage(messageInput) && (messageInput = '')}
				>
					<CircleArrowUp fill="white" class="h-7 w-7" />
				</button>
			{/if}
		</div>
	</footer>
{/snippet}

<div class="my-auto flex flex-col items-center">
	<!-- Header -->

	{#if splashScreenDisplay && splash}
		{@render splash()}
	{/if}

	{#if !splashScreenDisplay && options.displayHeader}
		<div class="flex-shrink-0 {options.headerClasses || ''}">
			{@render header()}
		</div>
	{/if}

	{#if !splashScreenDisplay}
		{@render body()}
	{/if}

	{@render footer()}

	<!--Display Suggested question 'pills'-->
	{#if options.suggestedQuestions.length > 0 && !(chat.messages.length > 1)}
		<div class="flex-shrink-0 p-4">
			<div class="flex flex-wrap gap-2">
				{#each options.suggestedQuestions as question}
					<button
						class="btn flex items-center bg--primary-50-950 border border-solid text-s rounded-lg px-3 py-1"
						onclick={() => sendMessage(question.questionString)}
						disabled={session?.status !== 'ready'}
					>
						{#if question.icon}
							<question.icon />
						{/if}
						{question.pillTitle}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
