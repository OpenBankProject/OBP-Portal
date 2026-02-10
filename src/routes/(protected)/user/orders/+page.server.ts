import { createLogger } from '$lib/utils/logger';
const logger = createLogger('UserOrdersServer');

import type { RequestEvent, Actions } from '@sveltejs/kit';
import { error, fail } from '@sveltejs/kit';
import type { OBPAccountApplication, OBPAccountApplicationsResponse, OBPProduct, APIProductDetails } from '$lib/obp/types';
import { obp_requests } from '$lib/obp/requests';
import { OBPRequestError, OBPErrorBase } from '$lib/obp/errors';
import { env } from '$env/dynamic/private';

const API_VERSION = 'v6.0.0';

interface OrderWithProduct {
	application: OBPAccountApplication;
	bankId: string;
	product?: APIProductDetails;
}

/**
 * Map an API Product response directly to APIProductDetails.
 * Reads first-class fields from the API Product response.
 */
function mapApiProductDetails(apiProduct: any): APIProductDetails {
	const product: OBPProduct = {
		bank_id: apiProduct.bank_id,
		product_code: apiProduct.api_product_code,
		parent_product_code: apiProduct.parent_api_product_code,
		name: apiProduct.name,
		more_info_url: apiProduct.more_info_url,
		terms_and_conditions_url: apiProduct.terms_and_conditions_url,
		description: apiProduct.description,
		meta: apiProduct.meta,
		product_attributes: apiProduct.attributes || []
	};

	return {
		product,
		apiCollectionId: apiProduct.collection_id || undefined,
		category: apiProduct.category || undefined,
		priceMonthly: apiProduct.monthly_subscription_amount
			? parseFloat(apiProduct.monthly_subscription_amount)
			: undefined,
		priceCurrency: apiProduct.monthly_subscription_currency || undefined,
		rateLimitPerSecond: apiProduct.per_second_call_limit || undefined,
		rateLimitPerMinute: apiProduct.per_minute_call_limit || undefined,
		rateLimitPerHour: apiProduct.per_hour_call_limit || undefined,
		rateLimitPerDay: apiProduct.per_day_call_limit || undefined,
		rateLimitPerWeek: apiProduct.per_week_call_limit || undefined,
		rateLimitPerMonth: apiProduct.per_month_call_limit || undefined
	};
}

function getStatusColor(status: string): string {
	switch (status.toUpperCase()) {
		case 'ACTIVE':
			return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
		case 'ACCEPTED':
			return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
		case 'REQUESTED':
			return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
		case 'REJECTED':
		case 'CANCELLED':
			return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
		default:
			return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
	}
}

export async function load(event: RequestEvent) {
	const token = event.locals.session.data.oauth?.access_token;

	if (!token) {
		error(401, { message: 'Unauthorized: Please sign in to view your orders.' });
	}

	// Get all banks
	let banks: Array<{ id: string }> = [];
	try {
		const banksResponse = await obp_requests.get(`/obp/${API_VERSION}/banks`);
		banks = banksResponse?.banks || [];
	} catch (e) {
		logger.error('Error fetching banks:', e);
	}

	// Fetch user's account applications (orders) from all banks
	const orders: OrderWithProduct[] = [];
	const productCache = new Map<string, APIProductDetails>();

	for (const bank of banks) {
		try {
			const response: OBPAccountApplicationsResponse = await obp_requests.get(
				`/obp/${API_VERSION}/banks/${bank.id}/account-applications`,
				token
			);

			if (response?.account_applications) {
				for (const app of response.account_applications) {
					// Fetch product details
					let product: APIProductDetails | undefined;
					const cacheKey = `${bank.id}:${app.product_code}`;

					if (productCache.has(cacheKey)) {
						product = productCache.get(cacheKey);
					} else {
						try {
							const apiProductResponse = await obp_requests.get(
								`/obp/${API_VERSION}/banks/${bank.id}/api-products/${app.product_code}`
							);
							product = mapApiProductDetails(apiProductResponse);
							productCache.set(cacheKey, product);
						} catch (e) {
							logger.warn(`Could not fetch product ${app.product_code} from bank ${bank.id}:`, e);
						}
					}

					orders.push({
						application: app,
						bankId: bank.id,
						product
					});
				}
			}
		} catch (e) {
			// Bank may not have account applications endpoint or user has no applications there
			logger.debug(`No account applications in bank ${bank.id}`);
		}
	}

	// Sort by date (newest first)
	orders.sort((a, b) =>
		new Date(b.application.date_of_application).getTime() -
		new Date(a.application.date_of_application).getTime()
	);

	// Check for success/pending query params
	const success = event.url.searchParams.get('success') === 'true';
	const pending = event.url.searchParams.get('pending') === 'true';
	const productName = event.url.searchParams.get('product') || '';

	return {
		orders,
		getStatusColor,
		successMessage: success ? `Successfully subscribed to ${productName || 'the product'}!` : null,
		pendingMessage: pending ? `Your order for ${productName || 'the product'} is being processed.` : null
	};
}

export const actions = {
	cancel: async ({ request, locals }) => {
		const data = await request.formData();
		const applicationId = data.get('application_id')?.toString();
		const bankId = data.get('bank_id')?.toString();

		if (!applicationId) {
			return fail(400, { error: 'Application ID is required.' });
		}

		if (!bankId) {
			return fail(400, { error: 'Bank ID is required.' });
		}

		const token = locals.session.data.oauth?.access_token;
		if (!token) {
			return fail(401, { error: 'Please sign in to continue.' });
		}

		try {
			// Update the account application status to CANCELLED
			await obp_requests.put(
				`/obp/${API_VERSION}/banks/${bankId}/account-applications/${applicationId}`,
				{ status: 'CANCELLED' },
				token
			);
			return { success: true, message: 'Subscription cancelled successfully.' };
		} catch (e) {
			let errorMsg = 'Failed to cancel subscription.';
			if (e instanceof OBPRequestError) {
				errorMsg = e.message;
			} else if (e instanceof Error) {
				errorMsg = e.message;
			}
			logger.error('Error cancelling subscription:', e);
			return fail(500, { error: errorMsg });
		}
	}
} satisfies Actions;
