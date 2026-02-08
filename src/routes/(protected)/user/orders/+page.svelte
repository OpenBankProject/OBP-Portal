<script lang="ts">
	import { Package, Calendar, ExternalLink, AlertCircle, CheckCircle } from '@lucide/svelte';

	let { data, form } = $props();

	function formatDate(dateString: string): string {
		try {
			return new Date(dateString).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return dateString;
		}
	}

	function formatPrice(price: number | undefined, currency: string = 'USD'): string {
		if (price === undefined || price === null) return 'N/A';
		if (price === 0) return 'Free';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency,
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(price);
	}

	// Filter active and historical orders
	let activeOrders = $derived(
		data.orders.filter(o =>
			['ACTIVE', 'ACCEPTED', 'REQUESTED'].includes(o.application.status.toUpperCase())
		)
	);

	let historicalOrders = $derived(
		data.orders.filter(o =>
			['REJECTED', 'CANCELLED'].includes(o.application.status.toUpperCase())
		)
	);
</script>

<svelte:head>
	<title>My Orders</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
		My Orders & Subscriptions
	</h1>

	<!-- Success Message -->
	{#if data.successMessage}
		<div class="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20 flex items-start gap-3">
			<CheckCircle class="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
			<div>
				<p class="text-green-700 dark:text-green-400 font-medium">{data.successMessage}</p>
				<p class="text-sm text-green-600 dark:text-green-500 mt-1">
					Your API access is now active. Check your email for details.
				</p>
			</div>
		</div>
	{/if}

	<!-- Pending Message -->
	{#if data.pendingMessage}
		<div class="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20 flex items-start gap-3">
			<AlertCircle class="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
			<div>
				<p class="text-yellow-700 dark:text-yellow-400 font-medium">{data.pendingMessage}</p>
				<p class="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
					You'll receive confirmation once payment is complete.
				</p>
			</div>
		</div>
	{/if}

	<!-- Form Messages -->
	{#if form?.success}
		<div class="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
			<p class="text-green-700 dark:text-green-400">{form.message}</p>
		</div>
	{/if}

	{#if form?.error}
		<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
			<p class="text-red-600 dark:text-red-400">{form.error}</p>
		</div>
	{/if}

	<!-- Active Subscriptions -->
	<section class="mb-8">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
			Active Subscriptions
		</h2>

		{#if activeOrders.length > 0}
			<div class="space-y-4">
				{#each activeOrders as order (order.application.account_application_id)}
					<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
							<div class="flex-1">
								<div class="flex items-center gap-3 mb-2">
									<Package class="h-5 w-5 text-gray-400" />
									<h3 class="font-semibold text-gray-900 dark:text-gray-100">
										{order.product?.product.name || order.application.product_code}
									</h3>
									<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {data.getStatusColor(order.application.status)}">
										{order.application.status}
									</span>
								</div>

								{#if order.product?.product.description}
									<p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
										{order.product.product.description}
									</p>
								{/if}

								<div class="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
									<div class="flex items-center gap-1">
										<Calendar class="h-4 w-4" />
										<span>Started {formatDate(order.application.date_of_application)}</span>
									</div>
									{#if order.product?.priceMonthly !== undefined}
										<span>
											{formatPrice(order.product.priceMonthly, order.product.priceCurrency)}/month
										</span>
									{/if}
								</div>
							</div>

							<div class="flex flex-col gap-2">
								<a
									href="/products/{order.application.product_code}"
									class="btn preset-outlined-primary-500 text-sm flex items-center gap-1"
								>
									View Product
									<ExternalLink class="h-3 w-3" />
								</a>

								{#if order.application.status.toUpperCase() !== 'CANCELLED'}
									<form method="POST" action="?/cancel">
										<input type="hidden" name="application_id" value={order.application.account_application_id} />
										<input type="hidden" name="bank_id" value={order.bankId} />
										<button
											type="submit"
											class="btn preset-outlined text-sm text-red-500 border-red-300 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/20 w-full"
											onclick={(e) => {
												if (!confirm('Are you sure you want to cancel this subscription?')) {
													e.preventDefault();
												}
											}}
										>
											Cancel
										</button>
									</form>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
				<Package class="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
				<p class="text-gray-600 dark:text-gray-400 mb-4">
					You don't have any active subscriptions.
				</p>
				<a href="/products" class="btn preset-filled-primary-500">
					Browse Products
				</a>
			</div>
		{/if}
	</section>

	<!-- Order History -->
	{#if historicalOrders.length > 0}
		<section>
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
				Order History
			</h2>

			<div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
				<table class="w-full">
					<thead class="bg-gray-50 dark:bg-gray-700">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
								Product
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
								Date
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
								Status
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
						{#each historicalOrders as order (order.application.account_application_id)}
							<tr>
								<td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
									{order.product?.product.name || order.application.product_code}
								</td>
								<td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
									{formatDate(order.application.date_of_application)}
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {data.getStatusColor(order.application.status)}">
										{order.application.status}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	<!-- Help Section -->
	<div class="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
		<p class="text-sm text-gray-600 dark:text-gray-400">
			Need help with your subscription?
			<a href="/contact" class="text-primary-500 dark:text-primary-200 hover:underline">
				Contact Support
			</a>
		</p>
	</div>
</div>
