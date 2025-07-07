<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	import { renderMarkdown } from '$lib/markdown/helper-funcs';

	interface Props {
		title: string;
		documentName: string;
		triggerText: string;
		onAccept: () => void;
		accepted?: boolean;
		children?: Snippet;
	}

	let { title, documentName, triggerText, onAccept, accepted = false }: Props = $props();

	let open = $state(false);
	let content = $state('');
	let scrollViewport = $state<HTMLDivElement>();
	let hasScrolledToBottom = $state(false);
	let isLoading = $state(true);

	onMount(async () => {
		try {
			// Import the markdown file
			const module = await import(`$lib/assets/legal/${documentName}.md?raw`);
			content = renderMarkdown(module.default);
			console.log(`Loaded ${documentName} content successfully.`);

			isLoading = false;
		} catch (error) {
			console.error(`Failed to load ${documentName}:`, error);
			content = '<p>Failed to load document.</p>';
			isLoading = false;
		}
	});

	function handleScroll() {
		if (!scrollViewport) return;

		const { scrollTop, scrollHeight, clientHeight } = scrollViewport;
		const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance

		if (scrolledToBottom && !hasScrolledToBottom) {
			hasScrolledToBottom = true;
		}
	}

	function handleAccept() {
		if (hasScrolledToBottom) {
			onAccept();
			open = false;
			hasScrolledToBottom = false; // Reset for next time
		}
	}

	function handleOpenChange(newOpen: boolean) {
		open = newOpen;
		if (!open) {
			hasScrolledToBottom = false; // Reset when modal closes
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Trigger
		type="button"
		class="text-primary-500 focus:ring-primary-500 rounded hover:underline focus:ring-2 focus:ring-offset-2 focus:outline-none"
	>
		{triggerText}
	</Dialog.Trigger>

	<Dialog.Portal>
		<Dialog.Overlay
			class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
		/>

		<Dialog.Content
			class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 flex max-h-[90vh] w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] flex-col rounded-lg border bg-primary-100-900 shadow-lg"
		>
			<div class="flex items-center justify-between border-b p-6">
				<Dialog.Title class="text-lg font-semibold">
					{title}
				</Dialog.Title>
				<Dialog.Close
					class="ring-offset-background focus:ring-ring rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none"
				>
					<svg
						class="h-4 w-4"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="m18 6-12 12"></path>
						<path d="m6 6 12 12"></path>
					</svg>
					<span class="sr-only">Close</span>
				</Dialog.Close>
			</div>

			<div bind:this={scrollViewport} onscroll={handleScroll} class="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none">
				{#if isLoading}
					<div class="flex items-center justify-center py-8">
						<div class="border-primary-500 h-8 w-8 animate-spin rounded-full border-b-2"></div>
						<span class="ml-2">Loading document...</span>
					</div>
				{:else}
					<div class="prose dark:prose-invert">
						{@html content}
					</div>
				{/if}
			</div>

			<div class="flex items-center justify-between border-t bg-primary-50-950 p-6">
				<div class="flex items-center space-x-2">
					{#if !hasScrolledToBottom}
						<svg class="h-4 w-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
								clip-rule="evenodd"
							></path>
						</svg>
						<span class="text-sm text-gray-600">Please read the entire document to continue</span>
					{:else}
						<svg class="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							></path>
						</svg>
						<span class="text-sm text-green-600">Ready to accept</span>
					{/if}
				</div>

				<div class="flex space-x-3">
					<Dialog.Close
						class="focus:ring-primary-500 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:outline-none"
					>
						Cancel
					</Dialog.Close>
					<button
						onclick={handleAccept}
						disabled={!hasScrolledToBottom}
						class="bg-primary-500 hover:bg-primary-600 focus:ring-primary-500 rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						I Accept
					</button>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
