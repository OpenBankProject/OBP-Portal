<script lang="ts">
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
</script>

<div class="flex h-full w-full items-center justify-center">
    <div class="rounded-xl mx-auto w-auto sm:w-sm md:w-lg h-xl bg-white/10 p-4 max-w-xl backdrop-blur-xs align-middle divide-primary-50-950 divide-y">
        <h1 class="h2 text-center">Login</h1>

        {#if data.loading}
            <div class="text-center my-4">
                <p>Loading authentication providers...</p>
            </div>
        {:else if data.providers.length === 0}
            <div class="text-center my-4">
                <p class="text-red-500">No authentication providers available. Please contact your administrator.</p>
            </div>
        {:else if data.providers.length === 1}
            <!-- Single provider - this should not render as we redirect server-side -->
            <button type="button" class="btn preset-filled-primary-500 mx-auto my-4 block w-full sm:w-1/2">
                <a href="/login/{data.providers[0].provider}">Login with {data.providers[0].provider}</a>
            </button>
        {:else}
            <!-- Multiple providers - show selection -->
            <div class="space-y-3 mt-4">
                <p class="text-center text-sm text-gray-300">Choose your authentication provider:</p>
                {#each data.providers as provider}
                    <button type="button" class="btn preset-filled-primary-500 mx-auto block w-full">
                        <a href="/login/{provider.provider}" class="block w-full">
                            Login with {provider.provider}
                        </a>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>
