<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.collection?.api_collection_name || 'Featured Collection'} - API Collection</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<div class="mb-6">
		<a href="/featured" class="text-primary-500 hover:underline text-sm">
			&larr; Back to Featured Collections
		</a>
	</div>

	{#if data.collection}
		<div class="mb-8">
			<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
				{data.collection.api_collection_name}
			</h1>

			{#if data.collection.description}
				<p class="mb-4 text-gray-600 dark:text-gray-400">
					{data.collection.description}
				</p>
			{/if}

			<div class="flex items-center gap-2">
				{#if data.collection.is_sharable}
					<span class="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-600 dark:bg-green-900/20 dark:text-green-400">
						Sharable
					</span>
				{/if}
				<span class="text-xs text-gray-500 font-mono">ID: {data.collection.api_collection_id}</span>
			</div>
		</div>

		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
			Endpoints in this Collection
		</h2>

		{#if data.endpoints && data.endpoints.length > 0}
			<div class="grid gap-4 md:grid-cols-2">
				{#each data.endpoints as endpoint (endpoint.api_collection_endpoint_id)}
					<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
						<div class="flex items-center justify-between">
							<code class="text-sm font-semibold text-gray-900 dark:text-gray-100">
								{endpoint.operation_id}
							</code>
						</div>
						<p class="mt-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
							Endpoint ID: {endpoint.api_collection_endpoint_id}
						</p>
					</div>
				{/each}
			</div>
		{:else}
			<div class="rounded-lg bg-gray-100 p-6 text-center dark:bg-gray-800">
				<p class="text-gray-600 dark:text-gray-400">
					No endpoints in this collection.
				</p>
			</div>
		{/if}
	{:else}
		<div class="rounded-lg bg-gray-100 p-6 text-center dark:bg-gray-800">
			<p class="text-gray-600 dark:text-gray-400">
				Collection not found.
			</p>
		</div>
	{/if}
</div>
