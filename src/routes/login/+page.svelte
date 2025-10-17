<script lang="ts">
    import type { PageData } from './$types';
    import { onMount, onDestroy } from 'svelte';
    import { invalidateAll } from '$app/navigation';

    let { data }: { data: PageData } = $props();

    let refreshInterval: NodeJS.Timeout | undefined;

    function formatProviderName(provider: string): string {
        switch (provider) {
            case 'obp-oidc':
                return 'OBP OpenID Connect';
            case 'keycloak':
                return 'Keycloak';
            default:
                return provider.charAt(0).toUpperCase() + provider.slice(1);
        }
    }

    function formatLastUpdated(): string {
        if (!data.lastUpdated) return '';
        const lastUpdate = new Date(data.lastUpdated);
        const now = new Date();
        const diffMs = now.getTime() - lastUpdate.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);

        if (diffMinutes > 0) {
            return `Updated ${diffMinutes}m ago`;
        } else if (diffSeconds > 5) {
            return `Updated ${diffSeconds}s ago`;
        } else {
            return 'Just updated';
        }
    }

    onMount(() => {
        // Auto-refresh every 60 seconds to show provider status changes
        refreshInterval = setInterval(() => {
            invalidateAll();
        }, 60000);
    });

    onDestroy(() => {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    });
</script>

<div class="flex h-full w-full items-center justify-center">
    <div class="rounded-xl mx-auto w-auto sm:w-sm md:w-lg h-xl bg-white/10 p-4 max-w-xl backdrop-blur-xs align-middle divide-primary-50-950 divide-y">
        <div class="flex justify-between items-center">
            <h1 class="h2">Login</h1>
            <div class="text-xs text-gray-400">
                {formatLastUpdated()}
            </div>
        </div>

        {#if data.availableProviders.length === 0}
            <div class="text-center my-4">
                <p class="text-red-500">No authentication providers available. Please contact your administrator.</p>

                <!-- Show unavailable providers even when no available providers -->
                {#if data.unavailableProviders.length > 0}
                    <div class="mt-6 pt-4 border-t border-gray-600">
                        <p class="text-center text-sm text-gray-400 mb-3">Currently unavailable:</p>
                        {#each data.unavailableProviders as provider}
                            <div class="w-full p-3 rounded-lg border border-gray-600 bg-gray-800/50 opacity-60">
                                <div class="flex items-center justify-between">
                                    <span class="flex items-center gap-2">
                                        <span class="text-red-400">●</span>
                                        <span class="text-gray-300">{formatProviderName(provider.provider)}</span>
                                    </span>
                                    <span class="text-xs text-red-400">Unavailable</span>
                                </div>
                                {#if provider.error}
                                    <div class="text-xs text-gray-400 mt-1 ml-5">
                                        {provider.error}
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {:else}
            <!-- Available providers -->
            <div class="space-y-3 mt-4">
                <p class="text-center text-sm text-gray-300">Choose your authentication provider:</p>
                {#each data.availableProviders as provider}
                    <button type="button" class="btn preset-filled-primary-500 mx-auto block w-full">
                        <a href="/login/{provider.provider}" class="block w-full flex items-center justify-between">
                            <span class="flex items-center gap-2">
                                <span class="text-green-400">●</span>
                                {formatProviderName(provider.provider)}
                            </span>
                        </a>
                    </button>
                {/each}

                <!-- Unavailable providers -->
                {#if data.unavailableProviders.length > 0}
                    <div class="mt-6 pt-4 border-t border-gray-600">
                        <p class="text-center text-sm text-gray-400 mb-3">Currently unavailable:</p>
                        {#each data.unavailableProviders as provider}
                            <div class="w-full p-3 rounded-lg border border-gray-600 bg-gray-800/50 opacity-60">
                                <div class="flex items-center justify-between">
                                    <span class="flex items-center gap-2">
                                        <span class="text-red-400">●</span>
                                        <span class="text-gray-300">{formatProviderName(provider.provider)}</span>
                                    </span>
                                    <span class="text-xs text-red-400">Unavailable</span>
                                </div>
                                {#if provider.error}
                                    <div class="text-xs text-gray-400 mt-1 ml-5">
                                        {provider.error}
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>
