<script lang="ts">
    import { Navigation } from '@skeletonlabs/skeleton-svelte';
    import OpeyChat from '$lib/components/OpeyChat.svelte';

    let { data } = $props();
    let name = data.username || 'Guest';

    let opeyChatOptions = {
        displayHeader: false,
    }

</script>

<div class="w-full text-center mx-auto">
    <OpeyChat {opeyChatOptions}/>
</div>