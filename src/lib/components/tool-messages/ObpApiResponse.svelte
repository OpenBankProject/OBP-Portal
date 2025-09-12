<script lang="ts">
    import type { ToolMessage } from '$lib/opey/types';
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

    // Extract key information dynamically
    let keyInfo = $derived.by(() => {
        if (!parsedOutput || typeof parsedOutput !== 'object') return [];
        
        const info = [];
        const keys = Object.keys(parsedOutput);
        
        // Show first few non-nested properties as quick summary
        for (const key of keys.slice(0, 5)) {
            const value = parsedOutput[key];
            if (value !== null && value !== undefined && typeof value !== 'object') {
                info.push({ key, value: String(value) });
            } else if (Array.isArray(value)) {
                info.push({ key, value: `${value.length} items` });
            } else if (typeof value === 'object' && value !== null) {
                info.push({ key, value: `Object (${Object.keys(value).length} properties)` });
            }
        }
        
        return info;
    });

    let hasMoreData = $derived(
        parsedOutput && typeof parsedOutput === 'object' && Object.keys(parsedOutput).length > 5
    );
</script>

{#if isError}
    <div class="alert variant-filled-error">
        <div class="font-bold">❌ API Request Failed</div>
        <div class="text-sm mt-1">
            <strong>Status:</strong> {parsedOutput?.code || parsedOutput?.status || 'Unknown'}<br/>
            <strong>Message:</strong> {parsedOutput?.message || parsedOutput?.error || 'Unknown error'}
            {#if parsedOutput?.error_message || parsedOutput?.detail}
                <br/><strong>Detail:</strong> {parsedOutput.error_message || parsedOutput.detail}
            {/if}
        </div>
        <details class="mt-2">
            <summary class="cursor-pointer text-xs">View Full Error Response</summary>
            <pre class="text-xs mt-2 bg-surface-100-800 p-2 rounded overflow-x-auto">{JSON.stringify(parsedOutput, null, 2)}</pre>
        </details>
    </div>
{:else if parsedOutput}
    <div class="alert variant-filled-success">
        <div class="font-bold">✅ API Request Successful</div>
        
        {#if keyInfo.length > 0}
            <div class="text-sm mt-2">
                {#each keyInfo as { key, value }}
                    <div><strong>{key}:</strong> {value}</div>
                {/each}
                {#if hasMoreData}
                    <div class="text-xs text-surface-500 mt-1">...and more (see full response below)</div>
                {/if}
            </div>
        {/if}
        
        <details class="mt-2">
            <summary class="cursor-pointer text-xs">View Full Response</summary>
            <pre class="text-xs mt-2 bg-surface-100-800 p-2 rounded overflow-x-auto">{JSON.stringify(parsedOutput, null, 2)}</pre>
        </details>
    </div>
{:else}
    <!-- Fallback for non-JSON output -->
    <div class="alert variant-filled-tertiary">
        <div class="font-bold">📄 Tool Response</div>
        <details class="mt-2">
            <summary class="cursor-pointer text-xs">View Raw Output</summary>
            <pre class="text-xs mt-2 bg-surface-100-800 p-2 rounded overflow-x-auto">{message.toolOutput}</pre>
        </details>
    </div>
{/if}