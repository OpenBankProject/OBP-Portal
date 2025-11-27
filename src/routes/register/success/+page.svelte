<script lang="ts">
    const { data } = $props()
    const userData = data.userData || {};

</script>

<div
	class="card preset-filled-primary-100-900 border-primary-200-800 divide-primary-200-800 mx-auto my-10 flex max-w-md flex-col divide-y border-[1px] shadow-lg sm:max-w-2xl lg:max-w-3xl"
>
	<header class="py-4">
		<h1 class="h4 text-center">User Registration Success</h1>
		<p class="text-center mt-2 text-sm text-surface-700-300">
			Please check your email to validate your email address.
		</p>
	</header>
	<article class="space-y-4 p-4">
        <div class="preset-filled-primary-50-950 shadow-md rounded-lg p-4 m-1.5">
            <ul class="list-inside space-y-2">
                {#each Object.entries(userData) as [key, value]}
                    {#if key === 'created_by_user'}
                    <li>
                        <strong class="text-tertiary-400">{key}:</strong> {JSON.stringify(value)}
                    </li>
                    {:else}
                    <li>
                        <strong class="text-tertiary-400">{key}:</strong> {value}
                    </li>
                    {/if}
                {/each}
            </ul>
        </div>
	</article>
</div>