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

<div class="flex h-full w-full items-center">
	<div class="mx-auto flex items-center h-5/6 w-5/6 max-w-200 rounded-2xl">
		<OpeyChat {opeyChatOptions}>
			{#snippet splash()}
				<div class="flex w-2/3 flex-col justify-center align-middle">
					<h1 class="h3 text-surface-700-300 text-center">Welcome!</h1>
					<h1 class="h3 text-center mb-4">What can I help you with?</h1>
					<p class="text-surface-700-300 mb-7 text-sm text-center">
						Welcome to OBP sandbox! This space provides developers, innovators and start-ups with
						APIs, documentation and access to localized data.
					</p>
				</div>
			{/snippet}
		</OpeyChat>
	</div>
</div>
