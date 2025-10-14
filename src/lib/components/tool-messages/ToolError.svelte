<script lang="ts">
	import type { ToolMessage } from '$lib/opey/types';

	let { message }: { message: ToolMessage } = $props();

	let errorOutput = $derived(
		message.toolOutput
			? typeof message.toolOutput === 'string'
				? message.toolOutput
				: JSON.stringify(message.toolOutput, null, 2)
			: 'Tool execution failed with no details provided.'
	);
</script>

<div class="alert preset-tonal-error">
    <div class="font-bold">❌ Tool Execution Failed</div>
    <div class="text-sm mt-2">
        <strong>Tool:</strong> {message.toolName}<br/>
        <strong>Error:</strong> {errorOutput}
    </div>
</div>