<script lang="ts">
    const { data } = $props()
    const userData = data.userData || {};

    let copySuccess = $state(false);
    let copyError = $state(false);

    async function copyToClipboard() {
        try {
            // Format data in a user-friendly way
            const formattedData = `
Registration Details
====================

User ID: ${userData.user_id || 'N/A'}
Email: ${userData.email || 'N/A'}
Username: ${userData.username || 'N/A'}
Provider ID: ${userData.provider_id || 'N/A'}
Provider: ${userData.provider || 'N/A'}
Entitlements: ${userData.entitlements?.list?.length > 0 ? userData.entitlements.list.join(', ') : 'None'}

Generated on: ${new Date().toLocaleString()}
            `.trim();

            // Check if clipboard API is available
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(formattedData);
                copySuccess = true;
                copyError = false;
                console.log('Copy successful via clipboard API');
            } else {
                // Fallback for older browsers or non-secure contexts
                const textArea = document.createElement('textarea');
                textArea.value = formattedData;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful) {
                    copySuccess = true;
                    copyError = false;
                    console.log('Copy successful via fallback method');
                } else {
                    throw new Error('Fallback copy failed');
                }
            }

            setTimeout(() => {
                copySuccess = false;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
            copyError = true;
            copySuccess = false;
            setTimeout(() => {
                copyError = false;
            }, 2000);
        }
    }
</script>

<div
	class="card preset-filled-primary-100-900 border-primary-200-800 divide-primary-200-800 mx-auto my-10 flex max-w-md flex-col divide-y border-[1px] shadow-lg sm:max-w-2xl lg:max-w-3xl"
>
	<header class="py-4">
		<h1 class="h4 text-center">User registration success</h1>
	</header>
	<article class="space-y-4 p-4">
        <div class="preset-filled-primary-50-950 shadow-md rounded-lg p-4 m-1.5">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold">Registration Details</h3>
                <button
                    on:click={copyToClipboard}
                    class="btn variant-filled-primary text-sm px-3 py-1 rounded-md transition-colors"
                    class:variant-filled-success={copySuccess}
                    class:variant-filled-error={copyError}
                    title="Copy registration data to clipboard"
                >
                    {copySuccess ? '✓ Copied!' : copyError ? '✗ Failed' : '📋 Copy'}
                </button>
            </div>
            <ul class="list-inside space-y-2">
                {#each Object.entries(userData) as [key, value]}
                    {#if key === 'created_by_user'}
                    <li>
                        <strong class="text-tertiary-400">{key}:</strong> {JSON.stringify(value)}
                    </li>
                    {:else if key === 'entitlements'}
                    <li>
                        <strong class="text-tertiary-400">{key}:</strong>
                        {#if value && typeof value === 'object' && value.list}
                            {value.list.length > 0 ? value.list.join(', ') : 'None'}
                        {:else}
                            {JSON.stringify(value)}
                        {/if}
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
