<script lang="ts">
	import OpeyChat from '$lib/components/OpeyChat.svelte';
	import type { OpeyChatOptions, SuggestedQuestion } from '$lib/components/OpeyChat.svelte';
    import { CheckCheck, Layers, Rocket, UserLock } from '@lucide/svelte';
	import { env } from '$env/dynamic/public';

	let { data } = $props();
	let name = data.username || 'Guest';
	let opeyConsentInfo = data.opeyConsentInfo;

	// Configurable text via environment variables
	const welcomeTitle = env.PUBLIC_WELCOME_TITLE || 'Welcome!';
	const helpQuestion = env.PUBLIC_HELP_QUESTION || 'How can I help?';
	const welcomeDescription = env.PUBLIC_WELCOME_DESCRIPTION || 'Welcome to the Open Bank Project sandbox — where developers, Fintechs, and banks can build and test innovative open banking ++ solutions.';

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
		}
	];

	let opeyChatOptions: Partial<OpeyChatOptions> = {
		displayHeader: false,
		currentlyActiveUserName: name,
		suggestedQuestions: suggestedQuestions,
		currentConsentInfo: opeyConsentInfo ? opeyConsentInfo : undefined,
		bodyClasses: 'bg-opacity-0',
		footerClasses: 'bg-opacity-0'
	};
	
</script>

<div class="flex h-full w-full items-center justify-center p-4">
	<div class="h-full max-h-[80vh] w-full max-w-4xl rounded-2xl">
		<OpeyChat {opeyChatOptions}>
			{#snippet splash()}
				<div class="flex w-2/3 flex-col items-center justify-center text-center">
					<h1 class="h3 text-surface-700-300 mb-2">{welcomeTitle}</h1>
					<h1 class="h3 mb-4">{helpQuestion}</h1>
					<p class="text-surface-700-300 mb-7 text-sm">
						{welcomeDescription}
					</p>
				</div>
			{/snippet}
		</OpeyChat>
	</div>
</div>
