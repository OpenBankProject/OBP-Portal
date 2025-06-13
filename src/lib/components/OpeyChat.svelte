<script lang="ts">
    import { onMount } from "svelte";
    import { CookieAuthStrategy } from "$lib/opey/services/AuthStrategy";
    import { ChatState, type ChatStateSnapshot } from "$lib/opey/state/ChatState";
    import { RestChatService } from "$lib/opey/services/RestChatService";
    import { ChatController } from "$lib/opey/controllers/ChatController";
    import { SessionState, type SessionSnapshot } from "$lib/opey/state/SessionState";
    import { ConsentSessionService } from "$lib/opey/services/ConsentSessionService";
    import { SessionController } from "$lib/opey/controllers/SessionController";


    // Interface for chat options
    interface OpeyChatOptions {
        baseUrl: string; // Base Opey URL
        displayHeader: boolean; // Whether to display the header with the logo and title
        displaySuggestions: boolean; // Whether to display the suggested questions as 'pills' above the input line
    }
    interface Props {
        opeyChatOptions?: Partial<OpeyChatOptions>; // Optional chat options to customize the component
    }
    // Default chat options
    const defaultChatOptions: OpeyChatOptions = {
        baseUrl: "http://localhost:5000",
        displayHeader: true,
        displaySuggestions: false,
    };
    let { opeyChatOptions }: Props = $props();
    // Merge default options with the provided options
    const options = { ...defaultChatOptions, ...opeyChatOptions };

    // Initialize session state and services
    const sessionState = new SessionState()
    const sessionService = new ConsentSessionService(options.baseUrl)
    const sessionController = new SessionController(sessionService, sessionState)

    const chatState = new ChatState()
    const chatService = new RestChatService(options.baseUrl, new CookieAuthStrategy())
    const chatController = new ChatController(chatService, chatState)

    let session: SessionSnapshot
    let chat: ChatStateSnapshot

    onMount(async () => {
        sessionState.subscribe(s => session = s)

        await sessionController.init()

        chatState.subscribe(c => chat = c)
        // now you have a cookie, chatService.send() will include it
        // hook up your UI to chatState
    })

    async function sendMessage(text: string) {
        await chatController.send(text)
    }
</script>

<!-- Header -->
{#if options.displayHeader}
    <header class="flex justify-between align-center preset-filled-secondary-300-700">
        <img src="/opey-logo-inv.png" alt="Opey Logo" class="h-10 my-auto mx-2 w-auto" />
        <h1 class="h4 p-2">Chat With Opey</h1>
    </header>
{/if}

<article class="space-y-4 p-4 md:h-100 overflow-auto preset-filled-secondary-50-950">
    <div>
      <h2 class="h6">Announcements</h2>
    </div>
</article>
<footer class="p-4 preset-filled-secondary-300-700">
    <input type="text" placeholder="Type your message here..." class="input w-full" />
    <button class="btn btn-primary w-full mt-2">Send</button>
</footer>