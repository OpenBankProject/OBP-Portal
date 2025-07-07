<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { CookieAuthStrategy } from '$lib/opey/services/AuthStrategy';
	import { ChatState, type ChatStateSnapshot } from '$lib/opey/state/ChatState';
	import { RestChatService } from '$lib/opey/services/RestChatService';
	import { ChatController } from '$lib/opey/controllers/ChatController';
	import { SessionState, type SessionSnapshot } from '$lib/opey/state/SessionState';
	import { ConsentSessionService } from '$lib/opey/services/ConsentSessionService';
	import { SessionController } from '$lib/opey/controllers/SessionController';
	import { DefaultOBPIntegrationService } from '$lib/opey/services/OBPIntegrationService';
	import type { ToolMessage } from '$lib/opey/types';
	import { Accordion, Avatar } from '@skeletonlabs/skeleton-svelte';
	import { Check, Hammer, LoaderCircle } from '@lucide/svelte';

	import { renderMarkdown } from '$lib/markdown/helper-funcs';

	// Interface for chat options
	interface OpeyChatOptions {
		baseUrl: string; // Base Opey URL
		displayHeader: boolean; // Whether to display the header with the logo and title
		currentlyActiveUserName: string; // Optional name of the currently active user
		suggestedQuestions: string[]; // List of suggested questions to display
		initialAssistantMessage?: string;
	}
	interface Props {
		opeyChatOptions?: Partial<OpeyChatOptions>; // Optional chat options to customize the component
		userAuthenticated?: boolean; // Optional prop to indicate if the user is authenticated
	}
	// Default chat options
	const defaultChatOptions: OpeyChatOptions = {
		baseUrl: 'http://localhost:5000',
		displayHeader: true,
		currentlyActiveUserName: 'Guest',
		suggestedQuestions: []
	};

	let { opeyChatOptions, userAuthenticated = false }: Props = $props();
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

<div class="flex h-full flex-col">
	<!-- Header -->
	{#if options.displayHeader}
		<header class="align-center preset-filled-secondary-300-700 flex flex-shrink-0 justify-between">
			<img src="/opey-logo-inv.png" alt="Opey Logo" class="mx-2 my-auto h-10 w-auto" />
			<h1 class="h4 p-2">Chat With Opey</h1>
		</header>
	{/if}

	<article class="preset-filled-secondary-50-950 flex-1 space-y-4 overflow-auto p-4">
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

	<!--Display Suggested question 'pills'-->
	{#if options.suggestedQuestions.length > 0 && !(chat.messages.length > 1)}
		<div class="preset-filled-secondary-50-950 flex-shrink-0 p-4">
			<p class="mb-2 ml-0 text-left text-xs">Try one of these questions:</p>
			<div class="flex flex-wrap gap-2">
				{#each options.suggestedQuestions as question}
					<button
						class="btn preset-filled-tertiary-500 text-s rounded-full px-3 py-1"
						onclick={() => sendMessage(question)}
						disabled={session?.status !== 'ready'}
					>
						{question}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<footer class="preset-filled-secondary-300-700 flex-shrink-0 p-4">
		<div class="flex gap-2">
			<input
				bind:value={messageInput}
				type="text"
				placeholder={session?.isAuthenticated
					? 'Ask about your banking...'
					: 'Connect your banking data to start chatting'}
				class="input flex-1"
				disabled={session?.status !== 'ready'}
				onkeydown={(e) => e.key === 'Enter' && sendMessage(messageInput) && (messageInput = '')}
			/>
			<button
				class="btn btn-primary"
				disabled={session?.status !== 'ready' || !messageInput.trim()}
				onclick={() => sendMessage(messageInput) && (messageInput = '')}
			>
				Send
			</button>
		</div>
	</footer>
</div>
