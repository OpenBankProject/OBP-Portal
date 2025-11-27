<script lang="ts">
    const { data } = $props()
    const userData = data.userData || {};

    // Function to convert field names to user-friendly labels
    function formatFieldName(key: string): string {
        // Map of common field names to their display labels
        const fieldMap: Record<string, string> = {
            'user_id': 'User ID',
            'email': 'Email',
            'username': 'Username',
            'first_name': 'First Name',
            'last_name': 'Last Name',
            'created_by_user_id': 'Created By User ID',
            'created_by_user': 'Created By User',
            'provider': 'Provider',
            'provider_id': 'Provider ID',
            'is_deleted': 'Is Deleted',
            'last_marketing_agreement_signed_date': 'Last Marketing Agreement Signed Date'
        };

        // Return mapped label or convert snake_case to Title Case
        if (fieldMap[key]) {
            return fieldMap[key];
        }

        // Convert snake_case to Title Case
        return key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

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
                        <strong class="text-tertiary-400">{formatFieldName(key)}:</strong> {JSON.stringify(value)}
                    </li>
                    {:else}
                    <li>
                        <strong class="text-tertiary-400">{formatFieldName(key)}:</strong> {value}
                    </li>
                    {/if}
                {/each}
            </ul>
        </div>
	</article>
</div>