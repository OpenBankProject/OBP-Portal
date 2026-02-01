<script lang="ts">
	let { data } = $props();

	// Track which descriptions are expanded
	let expandedIds = $state(new Set<string>());

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

	// Strip HTML tags and truncate text for preview
	function getDescriptionPreview(html: string, maxLength: number = 150): string {
		const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength).trim() + '...';
	}

	function hasMoreContent(html: string, maxLength: number = 150): boolean {
		const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
		return text.length > maxLength;
	}
</script>

<svelte:head>
	<title>Featured API Endpoints</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">Featured API Endpoints</h1>
	<p class="mb-8 text-gray-600 dark:text-gray-400">
		Discover curated API endpoints for common use cases.
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
			{#each data.endpoints as endpoint (endpoint.operation_id)}
				{@const isExpanded = expandedIds.has(endpoint.operation_id)}
				{@const hasEnrichedData = !!endpoint.summary}
				<div class="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
					<!-- Title -->
					<h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
						{endpoint.summary || endpoint.operation_id}
					</h3>

					<!-- Description preview or full -->
					{#if endpoint.description}
						<div class="mt-2 flex-grow">
							{#if isExpanded}
								<div class="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
									{@html endpoint.description}
								</div>
								<button
									class="mt-2 text-sm text-primary-500 dark:text-primary-200 hover:underline"
									onclick={() => toggleExpanded(endpoint.operation_id)}
								>
									Show less
								</button>
							{:else}
								<p class="text-sm text-gray-600 dark:text-gray-400">
									{getDescriptionPreview(endpoint.description)}
								</p>
								{#if hasMoreContent(endpoint.description)}
									<button
										class="mt-1 text-sm text-primary-500 dark:text-primary-200 hover:underline"
										onclick={() => toggleExpanded(endpoint.operation_id)}
									>
										More...
									</button>
								{/if}
							{/if}
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

					<!-- Tags and Operation ID -->
					<div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
						<div class="flex items-end justify-between gap-2">
							<!-- Tags on the left -->
							<div class="flex flex-wrap gap-1">
								{#if endpoint.tags && endpoint.tags.length > 0}
									{#each endpoint.tags.slice(0, 3) as tag}
										<span class="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
											{tag}
										</span>
									{/each}
									{#if endpoint.tags.length > 3}
										<span class="text-xs text-gray-400">+{endpoint.tags.length - 3}</span>
									{/if}
								{/if}
							</div>

							<!-- Links on the right -->
							<div class="flex items-center gap-2">
								<a
									href={buildTellMeMoreUrl(endpoint.operation_id)}
									class="text-xs text-secondary-500 dark:text-secondary-300 hover:underline whitespace-nowrap"
									title="Ask Opey about this endpoint"
								>
									Tell Me More
								</a>
								<span class="text-gray-300 dark:text-gray-600">|</span>
								<a
									href={buildApiExplorerUrl(endpoint.operation_id)}
									target="_blank"
									rel="noopener noreferrer"
									class="text-xs text-primary-500 dark:text-primary-200 hover:underline font-mono whitespace-nowrap"
									title="View in API Explorer"
								>
									{endpoint.operation_id}
								</a>
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
