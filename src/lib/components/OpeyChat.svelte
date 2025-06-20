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

	// Interface for chat options
	interface OpeyChatOptions {
		baseUrl: string; // Base Opey URL
		displayHeader: boolean; // Whether to display the header with the logo and title
		displaySuggestions: boolean;
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
		displaySuggestions: false
	};

	let { opeyChatOptions, userAuthenticated = false }: Props = $props();
	// Merge default options with the provided options
	const options = { ...defaultChatOptions, ...opeyChatOptions };

	// Initialize session state and services

	const sessionState = new SessionState();
	const sessionService = new ConsentSessionService(options.baseUrl);
	const sessionController = new SessionController(sessionService, sessionState);

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

<!-- Header -->
{#if options.displayHeader}
	<header class="align-center preset-filled-secondary-300-700 flex justify-between">
		<img src="/opey-logo-inv.png" alt="Opey Logo" class="mx-2 my-auto h-10 w-auto" />
		<h1 class="h4 p-2">Chat With Opey</h1>
	</header>
{/if}

<article class="preset-filled-secondary-50-950 space-y-4 overflow-auto p-4 md:h-100">
	<div class="space-y-2">
		{#each chat.messages as message (message.id)}
			{#if message.role === 'user'}
				<div class="flex justify-end">
					<div class="preset-filled-primary-500 max-w-3/5 rounded-2xl p-2 text-white">
						<strong>You:</strong>
						{message.message}
					</div>
				</div>
			{:else if message.role === 'assistant'}
				<div class="flex justify-start">
					<div class="preset-filled-secondary-500 max-w-3/5 rounded-2xl p-2 text-white">
						<strong>Opey:</strong>
						{message.message}
					</div>
				</div>
			{/if}
		{/each}
	</div>
</article>
<footer class="preset-filled-secondary-300-700 p-4">
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
