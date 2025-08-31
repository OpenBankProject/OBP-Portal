<script lang="ts">
	const { data } = $props();
	const userData = data.userData || {};
	const opeyConsentInfo = data.opeyConsentInfo || null;

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleString();
	}

	function formatJwtExpiration(timestamp: string) {
		const date = new Date(timestamp);
		const now = new Date();
		const isExpired = date < now;
		return {
			formatted: date.toLocaleString(),
			isExpired
		};
	}
</script>

<div class="flex flex-col space-y-6">
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
									{#if typeof value === 'object' && value !== null && 'list' in value && Array.isArray(value.list) && value.list.length === 0}
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

	<!-- Consent for Opey Section -->
	<div
		class="card preset-filled-primary-100-900 border-primary-200-800 divide-primary-200-800 mx-auto my-10 flex max-w-md flex-col divide-y border-[1px] shadow-lg sm:max-w-2xl lg:max-w-3xl"
	>
		<header class="py-4">
			<h1 class="h4 text-center">Consent for Opey</h1>
		</header>
		<article class="space-y-4 p-4">
			{#if opeyConsentInfo}
				<div class="preset-filled-primary-50-950 m-1.5 rounded-lg p-4 shadow-md">
					{#if opeyConsentInfo.hasActiveConsent}
						<div class="mb-4 flex items-center gap-2">
							<div class="h-3 w-3 rounded-full bg-green-500"></div>
							<span class="font-semibold text-gray-900 dark:text-gray-100">Active Consent</span>
						</div>
						<ul class="list-inside space-y-2 text-gray-900 dark:text-gray-100">
							<li>
								<strong class="text-tertiary-400">Consent ID:</strong>
								{opeyConsentInfo.consent_id}
							</li>
							<li>
								<strong class="text-tertiary-400">Status:</strong>
								{opeyConsentInfo.status}
							</li>
							<li>
								<strong class="text-tertiary-400">Consumer ID:</strong>
								{opeyConsentInfo.consumer_id}
							</li>
							<li>
								<strong class="text-tertiary-400">Created/Last Action:</strong>
								{formatDate(opeyConsentInfo.created_date)}
							</li>
							{#if opeyConsentInfo.jwt_expires}
								{@const jwtExp = formatJwtExpiration(opeyConsentInfo.jwt_expires)}
								<li>
									<strong class="text-tertiary-400">JWT Expires:</strong>
									{jwtExp.formatted}
									{jwtExp.isExpired ? '(Expired)' : ''}
								</li>
							{/if}
						</ul>
						<div class="bg-primary-100 dark:bg-primary-900/20 mt-4 rounded-lg p-3">
							<p class="text-sm text-gray-700 dark:text-gray-300">
								<strong>Info:</strong> This consent allows Opey to access your Open Bank Project data
								on your behalf. The JWT token is used for secure communication between the portal and
								Opey services.
							</p>
						</div>
					{:else}
						<div class="mb-4 flex items-center gap-2">
							<div class="h-3 w-3 rounded-full bg-yellow-500"></div>
							<span class="font-semibold text-gray-900 dark:text-gray-100">No Active Consent</span>
						</div>
						{#if opeyConsentInfo.error}
							<div class="bg-primary-100 dark:bg-primary-900/20 rounded-lg p-3">
								<p class="text-gray-700 dark:text-gray-300">
									<strong>Error:</strong>
									{opeyConsentInfo.error}
								</p>
							</div>
						{:else}
							<div class="bg-primary-100 dark:bg-primary-900/20 rounded-lg p-3">
								<p class="text-gray-700 dark:text-gray-300">
									{opeyConsentInfo.message}
								</p>
							</div>
						{/if}
					{/if}
				</div>
			{:else}
				<div class="preset-filled-primary-50-950 m-1.5 rounded-lg p-4 shadow-md">
					<p class="text-surface-600-400 text-center">Opey integration not configured.</p>
				</div>
			{/if}
		</article>
	</div>
</div>
