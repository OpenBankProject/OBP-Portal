<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Featured API Collections</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">Featured API Collections</h1>
	<p class="mb-8 text-gray-600 dark:text-gray-400">
		Discover curated collections of API endpoints for common use cases.
	</p>

	{#if data.error}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-900/20">
			<p class="text-red-600 dark:text-red-400">{data.error}</p>
		</div>
	{:else if data.collections && data.collections.length > 0}
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each data.collections as collection (collection.api_collection_id)}
				<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
					<div class="mb-3 flex items-start justify-between">
						<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
							{collection.api_collection_name}
						</h2>
						{#if collection.is_sharable}
							<span class="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-600 dark:bg-green-900/20 dark:text-green-400">
								Sharable
							</span>
						{/if}
					</div>

					{#if collection.description}
						<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
							{collection.description}
						</p>
					{:else}
						<p class="mb-4 text-sm italic text-gray-400 dark:text-gray-500">
							No description available.
						</p>
					{/if}

					<div class="border-t border-gray-100 pt-4 dark:border-gray-700">
						<a
							href="/featured/{collection.api_collection_id}"
							class="btn preset-filled-primary-500 w-full text-center"
						>
							View Endpoints
						</a>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="rounded-lg bg-gray-100 p-8 text-center dark:bg-gray-800">
			<p class="text-gray-600 dark:text-gray-400">
				No featured collections available at this time.
			</p>
		</div>
	{/if}
</div>
