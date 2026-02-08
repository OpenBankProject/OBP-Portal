import { createLogger } from '$lib/utils/logger';
const logger = createLogger('ProductsServer');

import type { RequestEvent } from '@sveltejs/kit';
import type { OBPProduct, OBPProductsResponse, APIProductDetails } from '$lib/obp/types';
import { obp_requests } from '$lib/obp/requests';
import { OBPRequestError, OBPErrorBase } from '$lib/obp/errors';
import { env } from '$env/dynamic/private';

const API_VERSION = 'v6.0.0';

/**
 * Parse product attributes into a structured APIProductDetails object
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

export async function load(event: RequestEvent) {
	const apiExplorerUrl = env.API_EXPLORER_URL || '';

	// First check if OBP-API is responding
	try {
		await obp_requests.get(`/obp/${API_VERSION}/root`);
	} catch (e) {
		logger.error('OBP-API is not responding:', e);
		return {
			products: [],
			error: 'OBP-API is not responding. Please check that the API server is running.',
			apiExplorerUrl
		};
	}

	// Fetch products from all banks
	let products: APIProductDetails[] = [];
	const debugInfo: {
		banksFound: number;
		bankIds: string[];
		rawBanksResponse?: any;
		productResponses: Array<{ bankId: string; response?: any; error?: string }>;
		attributesFetched: Array<{ productCode: string; attributes?: any; error?: string }>;
	} = {
		banksFound: 0,
		bankIds: [],
		productResponses: [],
		attributesFetched: []
	};

	// First, get all banks
	let banks: Array<{ id: string }> = [];
	try {
		const banksResponse = await obp_requests.get(`/obp/${API_VERSION}/banks`);
		debugInfo.rawBanksResponse = banksResponse;
		// OBP API returns banks with 'id' property (not 'bank_id')
		const rawBanks = banksResponse?.banks || [];
		// Map to normalize - handle both 'id' and 'bank_id' property names
		banks = rawBanks.map((b: any) => ({ id: b.id || b.bank_id }));
		debugInfo.banksFound = banks.length;
		debugInfo.bankIds = banks.map(b => b.id);
		logger.info(`Found ${banks.length} banks: ${banks.map(b => b.id).join(', ')}`);
	} catch (e) {
		logger.error('Error fetching banks:', e);
		return {
			products: [],
			error: 'Could not fetch banks list.',
			apiExplorerUrl,
			debug: debugInfo
		};
	}

	// Fetch products from each bank
	for (const bank of banks) {
		try {
			const productsUrl = `/obp/${API_VERSION}/banks/${bank.id}/products?product_type=API_PRODUCT`;
			const productsResponse: OBPProductsResponse = await obp_requests.get(productsUrl);
			debugInfo.productResponses.push({ bankId: bank.id, response: productsResponse });

			if (productsResponse?.products && productsResponse.products.length > 0) {
				logger.info(`Found ${productsResponse.products.length} products in bank ${bank.id}`);

				// Fetch attributes for each product if not included
				for (const product of productsResponse.products) {
					// If product doesn't have attributes, try to fetch them
					if (!product.product_attributes || product.product_attributes.length === 0) {
						try {
							const attrsUrl = `/obp/${API_VERSION}/banks/${bank.id}/products/${product.product_code}/attributes`;
							const attrsResponse = await obp_requests.get(attrsUrl);
							debugInfo.attributesFetched.push({
								productCode: product.product_code,
								attributes: attrsResponse
							});
							if (attrsResponse?.product_attributes) {
								product.product_attributes = attrsResponse.product_attributes;
							}
						} catch (e) {
							const errorMsg = e instanceof Error ? e.message : String(e);
							debugInfo.attributesFetched.push({
								productCode: product.product_code,
								error: errorMsg
							});
						}
					} else {
						debugInfo.attributesFetched.push({
							productCode: product.product_code,
							attributes: { included_in_product: true, product_attributes: product.product_attributes }
						});
					}

					const parsedProduct = parseProductAttributes(product);
					products.push(parsedProduct);
				}
			}
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : String(e);
			debugInfo.productResponses.push({ bankId: bank.id, error: errorMsg });
		}
	}

	logger.info(`Total products found across all banks: ${products.length}`);

	// Sort products by price (free first, then ascending)
	products.sort((a, b) => {
		const priceA = a.priceMonthly ?? 0;
		const priceB = b.priceMonthly ?? 0;
		return priceA - priceB;
	});

	// Check if user is logged in
	const isLoggedIn = !!event.locals.session?.data?.oauth?.access_token;

	return {
		products,
		apiExplorerUrl,
		isLoggedIn,
		debug: debugInfo
	};
}
