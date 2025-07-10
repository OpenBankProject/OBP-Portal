<script lang="ts">
	import { Navigation } from '@skeletonlabs/skeleton-svelte';
	import OpeyChat from '$lib/components/OpeyChat.svelte';
	import type { OpeyChatOptions, SuggestedQuestion } from '$lib/components/OpeyChat.svelte';
    import { CheckCheck, Layers, Rocket, UserLock,  } from '@lucide/svelte';

	let { data } = $props();
	let name = data.username || 'Guest';

	const suggestedQuestions: SuggestedQuestion[] = [
		{
            questionString: 'How can I get started with the Open Bank Project?',
            pillTitle: 'Getting Started',
            icon: Rocket
        },
        {
            questionString: 'How do I authenticate with the Open Bank Project?',
            pillTitle: 'Authentication',
            icon: UserLock
        },
        {
            questionString: 'How do I use consents within the Open Bank Project?',
            pillTitle: 'Consents',
            icon: CheckCheck
        },
        {
            questionString: 'What SDKs are available for the Open Bank Project?',
            pillTitle: 'SDKs',
            icon: Layers
        },
	];

	let opeyChatOptions: Partial<OpeyChatOptions> = {
		displayHeader: false,
		currentlyActiveUserName: name,
		suggestedQuestions: suggestedQuestions,
		bodyClasses: 'bg-opacity-0',
		footerClasses: 'bg-opacity-0'
	};
</script>

<div class="flex items-center justify-center h-full w-full p-4">
    <div class="h-full w-full max-w-4xl max-h-[80vh] rounded-2xl">
        <OpeyChat {opeyChatOptions}>
            {#snippet splash()}
                <div class="flex w-2/3 flex-col justify-center items-center text-center">
                    <h1 class="h3 text-surface-700-300 mb-2">Welcome!</h1>
                    <h1 class="h3 mb-4">What can I help you with?</h1>
                    <p class="text-surface-700-300 mb-7 text-sm">
                        Welcome to OBP sandbox! This space provides developers, innovators and start-ups with
                        APIs, documentation and access to localized data.
                    </p>
                </div>
            {/snippet}
        </OpeyChat>
    </div>
</div>
