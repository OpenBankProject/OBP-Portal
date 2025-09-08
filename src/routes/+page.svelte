<script lang="ts">
	import { Navigation } from '@skeletonlabs/skeleton-svelte';
	import OpeyChat from '$lib/components/OpeyChat.svelte';
	import type { OpeyChatOptions, SuggestedQuestion } from '$lib/components/OpeyChat.svelte';
    import { CheckCheck, Layers, Rocket, UserLock,  } from '@lucide/svelte';

	let { data } = $props();
	let name = data.username || 'Guest';
	let opeyConsentStatus = data.opeyConsentStatus || 'none';
	let opeyConsentReferenceId = data.opeyConsentReferenceId || null;

	function getStatusColor(status: string): string {
		switch (status) {
			case 'ready':
				return 'bg-green-500';
			case 'initiated':
				return 'bg-yellow-500';
			case 'none':
			default:
				return 'bg-red-500';
		}
	}

	function getStatusTitle(status: string): string {
		const baseTitle = (() => {
			switch (status) {
				case 'ready':
					return 'Opey Consent Ready (ACCEPTED)';
				case 'initiated':
					return 'Opey Consent Created (INITIATED)';
				case 'none':
				default:
					return 'No Opey Consent';
			}
		})();
		
		return opeyConsentReferenceId ? `${baseTitle}\nConsent Reference ID: ${opeyConsentReferenceId}` : baseTitle;
	}

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
                    <h1 class="h3 mb-4">How can I help?</h1>
                    <p class="text-surface-700-300 mb-7 text-sm">
                        Welcome to OBP sandbox! This space provides developers, innovators and start-ups with
                        APIs, documentation and access to localized data.
                    </p>
                </div>
            {/snippet}
        </OpeyChat>
    </div>
    
    <!-- Opey Consent Status Indicator -->
    {#if data.username}
        <div class="fixed bottom-4 right-4 z-50">
            <div 
                class="w-3 h-3 rounded-full {getStatusColor(opeyConsentStatus)}"
                title={getStatusTitle(opeyConsentStatus)}
            ></div>
        </div>
    {/if}
</div>
