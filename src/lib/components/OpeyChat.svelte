<script lang="ts">
    import type { OpeyChatState } from "$lib/opey/types";
    import {v4 as uuidv4} from 'uuid';

    // Interface for chat options
    interface OpeyChatOptions {
        displayHeader: boolean; // Whether to display the header with the logo and title
        displaySuggestions: boolean; // Whether to display the suggested questions as 'pills' above the input line
        
    }

    interface Props {
        opeyChatOptions?: Partial<OpeyChatOptions>; // Optional chat options to customize the component
    }

    // Default chat options
    const defaultChatOptions: OpeyChatOptions = {
        displayHeader: true,
        displaySuggestions: false,
    };

    let { opeyChatOptions }: Props = $props();

    // Merge default options with the provided options
    const options = { ...defaultChatOptions, ...opeyChatOptions };

    let opeyChatState = $state<OpeyChatState>({
        messages: [],
        currentAssistantMessage: {
            role: 'assistant',
            content: `Welcome to the Open Bank Project, let me know if you've got any questions!`,
            toolCalls: [],
            id: uuidv4(),
        },
        userIsAuthenticated: false,
        status: 'ready',
        threadId: uuidv4(),
    });
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