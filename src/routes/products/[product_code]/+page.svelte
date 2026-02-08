<script lang="ts">
	import { Zap, Check, ArrowLeft, ExternalLink } from '@lucide/svelte';

	let { data } = $props();

	function formatPrice(price: number | undefined, currency: string = 'USD'): string {
		if (price === undefined || price === null) return 'Contact us';
		if (price === 0) return 'Free';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency,
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(price);
	}

	function formatRateLimit(limit: number | undefined): string {
		if (!limit) return 'Unlimited';
		if (limit >= 1000) return `${(limit / 1000).toFixed(0)}k`;
		return limit.toString();
	}

	function getMethodColor(method: string): string {
		switch (method?.toUpperCase()) {
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
		const hyphenIndex = operationId.indexOf('-');
		const version = hyphenIndex > 0 ? operationId.substring(0, hyphenIndex) : operationId;
		const baseUrl = data.apiExplorerUrl.replace(/\/$/, '');
		return `${baseUrl}/resource-docs/${version}?operationid=${operationId}`;
	}

	// Determine tier styling
	function getTierStyle(productCode: string): { badge: string; badgeText: string } {
		const code = productCode.toLowerCase();
		if (code.includes('enterprise') || code.includes('premium')) {
			return {
				badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
				badgeText: 'Enterprise'
			};
		}
		if (code.includes('pro') || code.includes('professional')) {
			return {
				badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
				badgeText: 'Pro'
			};
		}
		if (code.includes('starter') || code.includes('basic') || code.includes('free')) {
			return {
				badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
				badgeText: 'Starter'
			};
		}
		return {
			badge: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
			badgeText: 'Standard'
		};
	}

	let tierStyle = $derived(getTierStyle(data.product.product.product_code));
</script>

<svelte:head>
	<title>{data.product.product.name} - API Products</title>
	<meta name="description" content={data.product.product.description || `Details for ${data.product.product.name}`} />
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Back link -->
	<a
		href="/products"
		class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-300 mb-6"
	>
		<ArrowLeft class="h-4 w-4" />
		Back to Products
	</a>

	<!-- Product Header -->
	<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
		<div class="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
			<div class="flex-1">
				<span class="inline-flex rounded-full px-3 py-1 text-sm font-medium {tierStyle.badge}">
					{tierStyle.badgeText}
				</span>
				<h1 class="mt-3 text-3xl font-bold text-gray-900 dark:text-gray-100">
					{data.product.product.name}
				</h1>
				{#if data.product.product.description}
					<p class="mt-4 text-gray-600 dark:text-gray-400">
						{data.product.product.description}
					</p>
				{/if}
			</div>

			<div class="md:text-right">
				<div class="text-4xl font-bold text-gray-900 dark:text-gray-100">
					{formatPrice(data.product.priceMonthly, data.product.priceCurrency)}
				</div>
				{#if data.product.priceMonthly && data.product.priceMonthly > 0}
					<div class="text-gray-500 dark:text-gray-400">per month</div>
				{/if}

				<div class="mt-4">
					{#if data.isLoggedIn}
						<a
							href="/checkout/{data.product.product.product_code}"
							class="btn preset-filled-primary-500 px-8"
						>
							Subscribe Now
						</a>
					{:else}
						<a
							href="/login?redirect=/checkout/{data.product.product.product_code}"
							class="btn preset-outlined-primary-500 px-8"
						>
							Sign in to Subscribe
						</a>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Rate Limits & Features Grid -->
	<div class="grid gap-6 md:grid-cols-2 mb-8">
		<!-- Rate Limits Card -->
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
				Rate Limits
			</h2>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Zap class="h-5 w-5 text-yellow-500" />
						<span class="text-gray-700 dark:text-gray-300">Requests per minute</span>
					</div>
					<span class="font-semibold text-gray-900 dark:text-gray-100">
						{formatRateLimit(data.product.rateLimitPerMinute)}
					</span>
				</div>
				{#if data.product.rateLimitPerDay}
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Zap class="h-5 w-5 text-yellow-500" />
							<span class="text-gray-700 dark:text-gray-300">Requests per day</span>
						</div>
						<span class="font-semibold text-gray-900 dark:text-gray-100">
							{formatRateLimit(data.product.rateLimitPerDay)}
						</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Features Card -->
		{#if data.product.features && data.product.features.length > 0}
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
					Features
				</h2>
				<ul class="space-y-2">
					{#each data.product.features as feature}
						<li class="flex items-start gap-2">
							<Check class="h-5 w-5 mt-0.5 text-green-500 flex-shrink-0" />
							<span class="text-gray-700 dark:text-gray-300">{feature}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>

	<!-- Included Endpoints -->
	{#if data.endpoints.length > 0}
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
					Included API Endpoints
				</h2>
				<span class="text-sm text-gray-500 dark:text-gray-400">
					{data.endpointCount} endpoint{data.endpointCount === 1 ? '' : 's'}
				</span>
			</div>

			<div class="space-y-2 max-h-96 overflow-y-auto">
				{#each data.endpoints as endpoint (endpoint.operation_id)}
					<div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
						<div class="flex items-center gap-3 min-w-0 flex-1">
							{#if endpoint.request_verb}
								<span class="inline-flex rounded px-2 py-0.5 text-xs font-bold uppercase {getMethodColor(endpoint.request_verb)} flex-shrink-0">
									{endpoint.request_verb}
								</span>
							{/if}
							<div class="min-w-0 flex-1">
								<div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
									{endpoint.summary || endpoint.operation_id}
								</div>
								{#if endpoint.request_url}
									<code class="text-xs text-gray-500 dark:text-gray-400 truncate block">
										{endpoint.request_url}
									</code>
								{/if}
							</div>
						</div>
						{#if data.apiExplorerUrl}
							<a
								href={buildApiExplorerUrl(endpoint.operation_id)}
								target="_blank"
								rel="noopener noreferrer"
								class="text-primary-500 dark:text-primary-200 hover:text-primary-600 dark:hover:text-primary-100 flex-shrink-0 ml-2"
								title="View in API Explorer"
							>
								<ExternalLink class="h-4 w-4" />
							</a>
						{/if}
					</div>
				{/each}
			</div>

			{#if data.apiExplorerUrl && data.product.apiCollectionId}
				<div class="mt-4 pt-4 border-t dark:border-gray-700 text-center">
					<a
						href="{data.apiExplorerUrl}/resource-docs?api-collection-id={data.product.apiCollectionId}"
						target="_blank"
						rel="noopener noreferrer"
						class="text-sm text-primary-500 dark:text-primary-200 hover:underline inline-flex items-center gap-1"
					>
						View all endpoints in API Explorer
						<ExternalLink class="h-3 w-3" />
					</a>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Terms and More Info Links -->
	{#if data.product.product.terms_and_conditions_url || data.product.product.more_info_url}
		<div class="mt-6 text-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
			{#if data.product.product.terms_and_conditions_url}
				<a
					href={data.product.product.terms_and_conditions_url}
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-primary-500 dark:hover:text-primary-300"
				>
					Terms and Conditions
				</a>
			{/if}
			{#if data.product.product.more_info_url}
				<a
					href={data.product.product.more_info_url}
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-primary-500 dark:hover:text-primary-300"
				>
					More Information
				</a>
			{/if}
		</div>
	{/if}
</div>
