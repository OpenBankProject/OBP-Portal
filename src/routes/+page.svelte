<script lang="ts">
	import { Navigation } from '@skeletonlabs/skeleton-svelte';
	import OpeyChat from '$lib/components/OpeyChat.svelte';
	import type { OpeyChatOptions } from '$lib/components/OpeyChat.svelte';

	let { data } = $props();
	let name = data.username || 'Guest';

	const suggestedQuestions = [
		'What is the Open Bank Project?',
		'How can I get started with the Open Bank Project?',
		'What features does OBP offer?',
		'How do I authenticate?'
	];

	let opeyChatOptions: Partial<OpeyChatOptions> = {
		displayHeader: false,
		currentlyActiveUserName: name,
		suggestedQuestions: suggestedQuestions,
		bodyClasses: 'bg-opacity-0',
		footerClasses: 'bg-opacity-0'
	};
</script>

<div class="flex items-center bg-conic-280 dark:from-primary-950 from-30% dark:via-secondary-500/50 via-40% dark:to-primary-950 to-50% h-full w-full">
	<div class="mx-auto flex h-5/6 w-5/6 max-w-200 rounded-2xl">
		<OpeyChat {opeyChatOptions}>
			{#snippet splash()}
				<div class="flex flex-col justify-center w-1/2 align-middle">
					<h1 class="h2 text-center text-surface-500">Welcome!</h1>
                    <h1 class="h2 text-center ">What can I help you with?</h1>
                    <p class="text-center text-surface-300-700">
                        Welcome to OBP sandbox! This space provides developers, innovators and start-ups with APIs, documentation and access to localized data.
                    </p>
				</div>
			{/snippet}
		</OpeyChat>
	</div>
</div>
