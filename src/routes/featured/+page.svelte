<script lang="ts">
	import { Copy, Check } from '@lucide/svelte';

	let { data } = $props();

	// Maximum characters to show in description preview
	const DESCRIPTION_CUTOFF_LENGTH = 500;

	// Calculate effective display length (after processing)
	function getEffectiveLength(markdown: string | undefined, summary?: string): number {
		if (!markdown) return 0;
		let text = markdown;

		// Remove summary if present (same logic as getDescriptionPreview)
		if (summary) {
			const cleanSummary = summary.trim();
			const headingPattern = new RegExp(`^#+\\s*${cleanSummary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n*`, 'i');
			text = text.replace(headingPattern, '').trim();
			if (text.startsWith(cleanSummary)) {
				text = text.substring(cleanSummary.length).trim();
			}
		}

		// Find earliest stop phrase
		let cutoffIndex = text.length;
		for (const phrase of STOP_PHRASES) {
			const index = text.indexOf(phrase);
			if (index !== -1 && index < cutoffIndex) {
				cutoffIndex = index;
			}
		}

		return Math.min(cutoffIndex, DESCRIPTION_CUTOFF_LENGTH);
	}

	// Sort endpoints by effective display length (descending) so longer cards appear at top
	let sortedEndpoints = $derived(
		[...(data.endpoints || [])].sort((a, b) => {
			const lenA = getEffectiveLength(a.description_markdown, a.summary);
			const lenB = getEffectiveLength(b.description_markdown, b.summary);
			return lenB - lenA;
		})
	);

	// Track which operation IDs have been copied (for feedback)
	let copiedIds = $state(new Set<string>());

	// Get truncated markdown (for copying) - similar logic to getDescriptionPreview but returns markdown
	function getMarkdownPreview(markdown: string, maxLength: number = DESCRIPTION_CUTOFF_LENGTH, summary?: string): string {
		let text = markdown;

		// If description starts with the summary, skip it
		if (summary) {
			const cleanSummary = summary.trim();
			const headingPattern = new RegExp(`^#+\\s*${cleanSummary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n*`, 'i');
			text = text.replace(headingPattern, '').trim();
			if (text.startsWith(cleanSummary)) {
				text = text.substring(cleanSummary.length).trim();
			}
		}

		// Find the earliest stop phrase
		let cutoffIndex = text.length;
		for (const phrase of STOP_PHRASES) {
			const index = text.indexOf(phrase);
			if (index !== -1 && index < cutoffIndex) {
				cutoffIndex = index;
			}
		}

		if (cutoffIndex < text.length) {
			text = text.substring(0, cutoffIndex).trim();
		}

		return text;
	}

	function buildCardText(endpoint: typeof data.endpoints[0]): string {
		const lines: string[] = [];

		// Title
		lines.push(`## ${endpoint.summary || endpoint.operation_id}`);
		lines.push('');

		// Description
		if (endpoint.description_markdown) {
			const preview = getMarkdownPreview(endpoint.description_markdown, 2000, endpoint.summary);
			lines.push(preview);
			lines.push('');
		}

		// Verb and Path
		if (endpoint.request_verb && endpoint.request_url) {
			lines.push(`${endpoint.request_verb} ${endpoint.request_url}`);
			lines.push('');
		}

		// Tags
		if (endpoint.tags && endpoint.tags.length > 0) {
			lines.push(`Tags: ${endpoint.tags.join(', ')}`);
			lines.push('');
		}

		// Operation ID and links
		lines.push(`Operation ID: ${endpoint.operation_id}`);
		lines.push(`Tell Me More: ${window.location.origin}${buildTellMeMoreUrl(endpoint.operation_id)}`);
		lines.push(`Explore: ${buildApiExplorerUrl(endpoint.operation_id)}`);

		return lines.join('\n');
	}

	async function copyCard(endpoint: typeof data.endpoints[0]) {
		const text = buildCardText(endpoint);
		try {
			await navigator.clipboard.writeText(text);
			copiedIds.add(endpoint.operation_id);
			copiedIds = new Set(copiedIds);
			// Reset after 2 seconds
			setTimeout(() => {
				copiedIds.delete(endpoint.operation_id);
				copiedIds = new Set(copiedIds);
			}, 2000);
		} catch (err) {
			// Fallback for older browsers or non-HTTPS contexts
			const textarea = document.createElement('textarea');
			textarea.value = text;
			textarea.style.position = 'fixed';
			textarea.style.opacity = '0';
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
			copiedIds.add(endpoint.operation_id);
			copiedIds = new Set(copiedIds);
			setTimeout(() => {
				copiedIds.delete(endpoint.operation_id);
				copiedIds = new Set(copiedIds);
			}, 2000);
		}
	}

	function toggleExpanded(operationId: string) {
		if (expandedIds.has(operationId)) {
			expandedIds.delete(operationId);
		} else {
			expandedIds.add(operationId);
		}
		expandedIds = new Set(expandedIds); // Trigger reactivity
	}

	function getMethodColor(method: string): string {
		switch (method.toUpperCase()) {
			case 'GET':
				return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
			case 'POST':
				return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
			case 'PUT':
				return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
			case 'DELETE':
				return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
			case 'PATCH':
				return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
			default:
				return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
		}
	}

	function buildApiExplorerUrl(operationId: string): string {
		if (!data.apiExplorerUrl) return '#';
		// Extract version from operationId (e.g., "OBPv6.0.0-getAbacRule" -> "OBPv6.0.0")
		const hyphenIndex = operationId.indexOf('-');
		const version = hyphenIndex > 0 ? operationId.substring(0, hyphenIndex) : operationId;
		// Build URL: /resource-docs/{VERSION}?operationid={operationId}
		const baseUrl = data.apiExplorerUrl.replace(/\/$/, ''); // Remove trailing slash if present
		return `${baseUrl}/resource-docs/${version}?operationid=${operationId}`;
	}

	function buildTellMeMoreUrl(operationId: string): string {
		const question = `Tell me more about the API endpoint with operation ID: ${operationId}`;
		return `/?ask=${encodeURIComponent(question)}`;
	}

	// Stop phrases that indicate technical content - truncate before these
	const STOP_PHRASES = [
		'URL Parameters:',
		'User Authentication is Optional. The User need not be logged in.',
		'JSON response body fields:',
		'User Authentication is Required.',
		'This is a management endpoint that requires the',
		'Authentication is required if the view',
		'Authentication is required as the tag',
	];

	// Convert markdown to clean text (for finding cut points)
	function markdownToText(markdown: string): string {
		return markdown
			.replace(/^#{1,6}\s+/gm, '') // Remove heading markers
			.replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
			.replace(/\*([^*]+)\*/g, '$1') // Italic
			.replace(/`([^`]+)`/g, '$1') // Inline code
			.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
			.replace(/^\s*[-*+]\s+/gm, '') // List markers
			.replace(/^\s*\d+\.\s+/gm, '') // Numbered list markers
			.replace(/\n+/g, ' ') // Newlines to spaces
			.replace(/\s+/g, ' ')
			.trim();
	}

	// Convert markdown to HTML (for rendering)
	function markdownToHtml(markdown: string): string {
		return markdown
			// Escape HTML first
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			// Then apply markdown formatting
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Bold
			.replace(/\*([^*]+)\*/g, '<em>$1</em>') // Italic
			.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">$1</code>') // Inline code
			.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-500 dark:text-primary-200 hover:underline">$1</a>') // Links
			.replace(/^#{1,6}\s+(.+)$/gm, '<strong>$1</strong>') // Headings to bold
			.replace(/\n\n+/g, '</p><p>') // Paragraph breaks
			.replace(/\n/g, ' ') // Single newlines to spaces
			.replace(/^/, '<p>') // Wrap in paragraph
			.replace(/$/, '</p>')
			.replace(/<p><\/p>/g, ''); // Remove empty paragraphs
	}

	// Get description preview as HTML, stopping at technical phrases
	function getDescriptionPreview(markdown: string, maxLength: number = DESCRIPTION_CUTOFF_LENGTH, summary?: string): string {
		let text = markdown;

		// If description starts with the summary (as heading or plain text), skip it
		if (summary) {
			const cleanSummary = summary.trim();
			// Check for markdown heading format
			const headingPattern = new RegExp(`^#+\\s*${cleanSummary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n*`, 'i');
			text = text.replace(headingPattern, '').trim();
			// Also check plain text start
			if (text.startsWith(cleanSummary)) {
				text = text.substring(cleanSummary.length).trim();
			}
		}

		// Find the earliest stop phrase
		let cutoffIndex = text.length;
		let stoppedByPhrase = false;
		for (const phrase of STOP_PHRASES) {
			const index = text.indexOf(phrase);
			if (index !== -1 && index < cutoffIndex) {
				cutoffIndex = index;
				stoppedByPhrase = true;
			}
		}

		// Use the earlier of: stop phrase position or maxLength
		const effectiveLength = Math.min(cutoffIndex, maxLength);
		const stoppedByMaxLength = maxLength < cutoffIndex;

		if (text.length <= effectiveLength && cutoffIndex === text.length) {
			return markdownToHtml(text);
		}

		// Find the last sentence boundary before cutoff
		let truncateAt = effectiveLength;
		const searchRegion = text.substring(0, effectiveLength);

		// Common abbreviations that shouldn't be treated as sentence ends
		const abbreviations = ['i.e.', 'e.g.', 'etc.', 'vs.', 'Mr.', 'Mrs.', 'Dr.', 'Jr.', 'Sr.', 'Inc.', 'Ltd.', 'Corp.'];

		// Look for sentence endings - period, exclamation, or question mark
		let lastSentenceEnd = -1;
		for (let i = searchRegion.length - 1; i >= 0; i--) {
			const char = searchRegion[i];
			if (char === '.' || char === '!' || char === '?') {
				// Check if next char is space followed by uppercase (new sentence) or end of region
				const isEndOfRegion = i === searchRegion.length - 1;
				const nextChar = !isEndOfRegion ? searchRegion[i + 1] : '';
				const charAfterSpace = (i + 2 < searchRegion.length) ? searchRegion[i + 2] : '';

				// Must be followed by space and uppercase letter (new sentence start)
				const looksLikeSentenceEnd = isEndOfRegion ||
					(nextChar === ' ' && charAfterSpace && charAfterSpace === charAfterSpace.toUpperCase() && charAfterSpace.match(/[A-Z]/));

				if (looksLikeSentenceEnd) {
					// Check it's not part of an abbreviation
					const precedingText = searchRegion.substring(Math.max(0, i - 5), i + 1).toLowerCase();
					const isAbbreviation = abbreviations.some(abbr => precedingText.endsWith(abbr.toLowerCase()));

					if (!isAbbreviation) {
						lastSentenceEnd = i + 1;
						break;
					}
				}
			}
		}

		if (lastSentenceEnd > 50) { // Only use sentence boundary if we have enough content
			truncateAt = lastSentenceEnd;
		}

		let result = text.substring(0, truncateAt).trim();
		// Only add ellipsis if we truncated due to maxLength, not due to stop phrase
		if (stoppedByMaxLength && truncateAt < text.length) {
			result += '...';
		}
		return markdownToHtml(result);
	}

</script>

<svelte:head>
	<title>Featured API Endpoints</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">Featured API Endpoints</h1>
	<p class="mb-8 text-gray-600 dark:text-gray-400">
		This page shows featured APIs collections and frequently used endpoints.
	</p>

	{#if data.error}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-900/20">
			<p class="text-red-600 dark:text-red-400">{data.error}</p>
		</div>
	{:else if data.message}
		<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center dark:border-blue-800 dark:bg-blue-900/20">
			<p class="text-blue-600 dark:text-blue-400">{data.message}</p>
		</div>
	{:else if data.endpoints && data.endpoints.length > 0}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each sortedEndpoints as endpoint (endpoint.operation_id)}
				{@const hasEnrichedData = !!endpoint.summary}
				<div class="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
					<!-- Title -->
					<h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
						{endpoint.summary || endpoint.operation_id}
					</h3>

					<!-- Description -->
					{#if endpoint.description_markdown}
						<div class="mt-2 flex-grow text-sm text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none">
							{@html getDescriptionPreview(endpoint.description_markdown, DESCRIPTION_CUTOFF_LENGTH, endpoint.summary)}
						</div>
					{/if}

					<!-- Verb and Path (only if enriched) -->
					{#if hasEnrichedData && endpoint.request_verb}
						<div class="mt-2 flex flex-wrap items-center gap-2">
							<span class={`inline-flex rounded px-2 py-1 text-xs font-bold uppercase ${getMethodColor(endpoint.request_verb)}`}>
								{endpoint.request_verb}
							</span>
							<code class="text-xs font-medium text-gray-600 dark:text-gray-400 break-all">
								{endpoint.request_url}
							</code>
						</div>
					{/if}

					<!-- Tags and Links -->
					<div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
						<!-- Tags -->
						{#if endpoint.tags && endpoint.tags.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each endpoint.tags.slice(0, 3) as tag}
									<span class="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
										{tag}
									</span>
								{/each}
								{#if endpoint.tags.length > 3}
									<span class="text-xs text-gray-400">+{endpoint.tags.length - 3}</span>
								{/if}
							</div>
						{/if}

						<!-- Links -->
						<div class="flex flex-col items-end gap-1">
							<a
								href={buildTellMeMoreUrl(endpoint.operation_id)}
								class="text-xs text-secondary-500 dark:text-secondary-300 hover:underline"
								title="Ask Opey about this endpoint"
							>
								Tell Me More
							</a>
							<div class="flex items-center gap-2">
								<a
									href={buildApiExplorerUrl(endpoint.operation_id)}
									target="_blank"
									rel="noopener noreferrer"
									class="text-xs text-primary-500 dark:text-primary-200 hover:underline"
									title="View in API Explorer"
								>
									Explore: <span class="font-mono">{endpoint.operation_id}</span>
								</a>
								<button
									type="button"
									onclick={(e) => { e.preventDefault(); e.stopPropagation(); copyCard(endpoint); }}
									class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
									title="Copy Endpoint summary"
								>
									{#if copiedIds.has(endpoint.operation_id)}
										<Check class="h-4 w-4 text-green-500" />
									{:else}
										<Copy class="h-4 w-4" />
									{/if}
								</button>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<p class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
			Showing {data.endpoints.length} featured endpoint{data.endpoints.length === 1 ? '' : 's'}
		</p>
	{:else}
		<div class="rounded-lg bg-gray-100 p-8 text-center dark:bg-gray-800">
			<p class="text-gray-600 dark:text-gray-400">
				No featured endpoints available at this time.
			</p>
		</div>
	{/if}
</div>
