import { createLogger } from '$lib/utils/logger';
const logger = createLogger('CheckoutServer');

import type { RequestEvent, Actions } from '@sveltejs/kit';
import { error, fail, redirect } from '@sveltejs/kit';
import type { OBPProduct, APIProductDetails, OBPAccountApplication } from '$lib/obp/types';
import { obp_requests } from '$lib/obp/requests';
import { OBPRequestError, OBPErrorBase } from '$lib/obp/errors';
import { env } from '$env/dynamic/private';

const API_VERSION = 'v6.0.0';

// Stripe checkout URL (from OBP-Stripe service)
const STRIPE_CHECKOUT_URL = env.STRIPE_CHECKOUT_URL || '';

/**
 * Find a product by scanning all banks
 */
async function findProduct(productCode: string): Promise<APIProductDetails | null> {
	// First, get all banks
	let banks: Array<{ id: string }> = [];
	try {
		const banksResponse = await obp_requests.get(`/obp/${API_VERSION}/banks`);
		banks = banksResponse?.banks || [];
	} catch (e) {
		logger.error('Error fetching banks:', e);
		return null;
	}

	// Search for the product in each bank
	for (const bank of banks) {
		try {
			const productResponse: OBPProduct = await obp_requests.get(
				`/obp/${API_VERSION}/banks/${bank.id}/products/${productCode}`
			);

			if (productResponse) {
				logger.info(`Found product ${productCode} in bank ${bank.id}`);
				return parseProductAttributes(productResponse);
			}
		} catch (e) {
			// Product not in this bank, continue searching
		}
	}

	return null;
}

/**
 * Parse product attributes
 */
function parseProductAttributes(product: OBPProduct): APIProductDetails {
	const details: APIProductDetails = {
		product
	};

	if (product.product_attributes) {
		for (const attr of product.product_attributes) {
			switch (attr.name.toLowerCase()) {
				case 'api_collection_id':
					details.apiCollectionId = attr.value;
					break;
				case 'stripe_price_id':
					details.stripePriceId = attr.value;
					break;
				case 'rate_limit_per_minute':
					details.rateLimitPerMinute = parseInt(attr.value, 10) || undefined;
					break;
				case 'rate_limit_per_day':
					details.rateLimitPerDay = parseInt(attr.value, 10) || undefined;
					break;
				case 'features':
					try {
						details.features = JSON.parse(attr.value);
					} catch {
						details.features = attr.value.split(',').map(f => f.trim());
					}
					break;
				case 'price_monthly':
					details.priceMonthly = parseFloat(attr.value) || undefined;
					break;
				case 'price_currency':
					details.priceCurrency = attr.value;
					break;
			}
		}
	}

	return details;
}

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

export async function load(event: RequestEvent) {
	const productCode = event.params.product_code;
	const token = event.locals.session.data.oauth?.access_token;

	if (!token) {
		error(401, { message: 'Unauthorized: Please sign in to continue.' });
	}

	if (!productCode) {
		error(400, { message: 'Product code is required.' });
	}

	// Fetch the product by scanning all banks
	const product = await findProduct(productCode);

	if (!product) {
		error(404, { message: `Product not found: ${productCode}` });
	}

	// Get user info
	const user = event.locals.session.data.user;

	return {
		product,
		user: {
			email: user?.email || '',
			username: user?.username || ''
		},
		priceFormatted: formatPrice(product.priceMonthly, product.priceCurrency),
		hasStripeIntegration: !!STRIPE_CHECKOUT_URL && !!product.stripePriceId
	};
}

export const actions = {
	checkout: async ({ request, locals, params }) => {
		const productCode = params.product_code;
		const token = locals.session.data.oauth?.access_token;
		const user = locals.session.data.user;

		if (!token) {
			return fail(401, { error: 'Please sign in to continue.' });
		}

		if (!productCode) {
			return fail(400, { error: 'Product code is required.' });
		}

		// Fetch the product to get stripe_price_id and bank_id
		const product = await findProduct(productCode);

		if (!product) {
			return fail(404, { error: `Product not found: ${productCode}` });
		}

		const bankId = product.product.bank_id;

		// Create Account Application (Order)
		let accountApplication: OBPAccountApplication | null = null;

		try {
			accountApplication = await obp_requests.post(
				`/obp/${API_VERSION}/banks/${bankId}/account-applications`,
				{ product_code: productCode },
				token
			);
			logger.info(`Created account application: ${accountApplication?.account_application_id}`);
		} catch (e) {
			let errorMsg = 'Failed to create order.';
			if (e instanceof OBPRequestError) {
				errorMsg = e.message;
			} else if (e instanceof Error) {
				errorMsg = e.message;
			}
			logger.error('Error creating account application:', e);
			return fail(500, { error: errorMsg });
		}

		// If this is a free product, redirect to orders page
		if (!product.priceMonthly || product.priceMonthly === 0) {
			redirect(303, '/user/orders?success=true&product=' + encodeURIComponent(product.product.name));
		}

		// If Stripe integration is available, redirect to Stripe checkout
		if (STRIPE_CHECKOUT_URL && product.stripePriceId) {
			const checkoutUrl = new URL(STRIPE_CHECKOUT_URL);
			checkoutUrl.searchParams.set('price_id', product.stripePriceId);
			checkoutUrl.searchParams.set('account_application_id', accountApplication?.account_application_id || '');
			checkoutUrl.searchParams.set('user_id', user?.user_id || '');
			checkoutUrl.searchParams.set('email', user?.email || '');
			checkoutUrl.searchParams.set('success_url', `${request.headers.get('origin')}/user/orders?success=true`);
			checkoutUrl.searchParams.set('cancel_url', `${request.headers.get('origin')}/checkout/${productCode}?cancelled=true`);

			redirect(303, checkoutUrl.toString());
		}

		// No Stripe integration - redirect to orders with pending status
		redirect(303, '/user/orders?pending=true&product=' + encodeURIComponent(product.product.name));
	}
} satisfies Actions;
