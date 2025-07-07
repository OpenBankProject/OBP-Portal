<script lang="ts">
    import { Navigation } from '@skeletonlabs/skeleton-svelte';
    import OpeyChat from '$lib/components/OpeyChat.svelte';

    let { data } = $props();
    let name = data.username || 'Guest';

    const suggestedQuestions = [
        'What is the Open Bank Project?',
        'How can I get started with the Open Bank Project?',
        'What features does OBP offer?',
        'How do I authenticate?',
    ];

    let opeyChatOptions = {
        displayHeader: false,
        currentlyActiveUserName: name,
        initialAssistantMessage: `Hello, how can I assist you today?`,
        suggestedQuestions: suggestedQuestions,
    }

</script>

<!-- <div class="w-full text-center mx-auto h-150">
    <OpeyChat {opeyChatOptions}/>
</div> -->