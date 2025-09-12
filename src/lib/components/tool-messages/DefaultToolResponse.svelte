<script lang="ts">
    import type { ToolMessage } from "$lib/opey/types";
    let { message }: { message: ToolMessage } = $props();

    let outputContent = $derived(
        message.toolOutput
            ? typeof message.toolOutput === "string"
                ? message.toolOutput
                : JSON.stringify(message.toolOutput, null, 2)
            : "No output available."
    );
</script>

<div class="alert preset-tonal-info">
    <div class="text-sm mt-2">
        <strong>Tool:</strong> {message.toolName}
    </div>
    <details class="mt-2">
        <summary class="cursor-pointer text-xs">View Output</summary>
        <pre class="text-xs mt-2 preset-filled-surface-500 p-2 rounded overflow-x-auto">{outputContent}</pre>
    </details>
</div>