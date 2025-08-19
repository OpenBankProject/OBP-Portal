<script lang="ts">
	const { data } = $props();
	const userData = data.userData || {};
</script>

<div
	class="card preset-filled-primary-100-900 border-primary-200-800 divide-primary-200-800 mx-auto my-10 flex max-w-md flex-col divide-y border-[1px] shadow-lg sm:max-w-2xl lg:max-w-3xl"
>
	<header class="py-4">
		<h1 class="h4 text-center">User Information</h1>
	</header>
	<article class="space-y-4 p-4">
		{#if userData && Object.keys(userData).length > 0}
			<div class="preset-filled-primary-50-950 m-1.5 rounded-lg p-4 shadow-md">
				<ul class="list-inside space-y-2">
					{#each Object.entries(userData) as [key, value]}
						{#if key === 'created_by_user'}
							<li>
								<strong class="text-tertiary-400">{key}:</strong>
								{JSON.stringify(value)}
							</li>
						{:else if key === 'views' || key === 'entitlements'}
							<li>
								<strong class="text-tertiary-400">{key}:</strong>
								{#if typeof value === 'object' && value !== null && value.list && Array.isArray(value.list) && value.list.length === 0}
									None
								{:else if Array.isArray(value) && value.length === 0}
									None
								{:else if Array.isArray(value)}
									{JSON.stringify(value, null, 2)}
								{:else if typeof value === 'object' && value !== null && Object.keys(value).length === 0}
									None
								{:else if typeof value === 'object' && value !== null}
									{JSON.stringify(value, null, 2)}
								{:else}
									{value}
								{/if}
							</li>
						{:else}
							<li>
								<strong class="text-tertiary-400">{key}:</strong>
								{value}
							</li>
						{/if}
					{/each}
				</ul>
			</div>
		{:else}
			<div class="preset-filled-primary-50-950 m-1.5 rounded-lg p-4 shadow-md">
				<p class="text-surface-600-400 text-center">No user data available.</p>
			</div>
		{/if}
	</article>
</div>
