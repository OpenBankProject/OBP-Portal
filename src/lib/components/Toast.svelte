<script lang="ts">
    import { Toast } from '@skeletonlabs/skeleton-svelte';
    import { toaster } from '$lib/utils/toastService';

    // Props to customize appearance if needed
    // See https://www.skeleton.dev/docs/components/toast/svelte for options
    export let width = 'max-w-md';
    export let padding = 'p-4';
    export let classes = 'bg-primary-400-600'
    export let rounded = 'rounded-lg';
    export let stateInfo = 'preset-filled-primary-500';
    export let stateSuccess = 'preset-filled-success-500';
    export let stateWarning = 'preset-filled-warning-500';
    export let stateError = 'preset-filled-error-500';
</script>

<Toast.Group 
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