<script lang="ts">
    import type { ToolMessage } from '$lib/opey/types';
    import { toast } from '$lib/utils/toastService';
    
    let { message }: { message: ToolMessage } = $props();
    
    let parsedOutput = $derived.by(() => {
        try {
            return typeof message.toolOutput === 'string' 
                ? JSON.parse(message.toolOutput) 
                : message.toolOutput;
        } catch {
            return null;
        }
    });
    
    let isError = $derived(
        parsedOutput?.error || 
        parsedOutput?.message || 
        (parsedOutput?.code && parsedOutput.code !== 200) ||
        (parsedOutput?.status && parsedOutput.status >= 400)
    );

    let outputContent = $derived(
        parsedOutput
            ? JSON.stringify(parsedOutput, null, 2)
            : typeof message.toolOutput === "string"
                ? message.toolOutput
                : "No output available."
    );

    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(outputContent);
            toast.success('Output copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy: ', err);
            toast.error('Failed to copy to clipboard.');
        }
    }
</script>

<div class="alert preset-tonal-info" class:border-error-500={isError} class:border-2={isError}>
    <div class="text-sm mt-2">
        <strong>Tool:</strong> {message.toolName}
    </div>
    {#if isError}
        <div class="text-sm mt-2 text-error-500">
            <strong>Error:</strong> {parsedOutput?.message || parsedOutput?.error || 'Request failed'}
            {#if parsedOutput?.code || parsedOutput?.status}
                <span class="ml-2">(Status: {parsedOutput.code || parsedOutput.status})</span>
            {/if}
        </div>
    {/if}
    <details class="mt-2">
        <summary class="cursor-pointer text-xs flex justify-between items-center">
            <span>View Output</span>
            <button
                type="button"
                class="btn btn-sm preset-tonal-primary"
                onclick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    copyToClipboard();
                }}
                title="Copy output"
                aria-label="Copy output"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            </button>
        </summary>
        <pre class="text-xs mt-2 preset-filled-primary-500 p-2 rounded max-h-96 overflow-auto font-mono whitespace-pre">{outputContent}</pre>
    </details>
</div>