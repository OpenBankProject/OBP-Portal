<script lang="ts">
    import { Toaster } from '@skeletonlabs/skeleton-svelte';
    import { toaster } from '$lib/utils/toastService';

    // Props to customize appearance if needed
    // See https://www.skeleton.dev/docs/components/toast/svelte for options
    export let width = 'max-w-md';
    export let padding = 'p-4';
    export let classes = 'bg-primary-400-600'
    export let rounded = 'rounded-lg';
    export let stateInfo = 'variant-filled-primary';
    export let stateSuccess = 'variant-filled-success';
    export let stateWarning = 'variant-filled-warning';
    export let stateError = 'variant-filled-error';
</script>

<Toaster 
    {toaster} 
    {width}
    {padding}
    {classes}
    {rounded}
    {stateInfo}
    {stateSuccess}
    {stateWarning}
    {stateError}
/>