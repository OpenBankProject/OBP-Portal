import { createLogger } from '$lib/utils/logger';
const logger = createLogger('ProductDetailServer');

import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import type { OBPProduct, APIProductDetails, OBPApiCollectionEndpointsResponse } from '$lib/obp/types';
import { obp_requests } from '$lib/obp/requests';
import { OBPErrorBase, OBPRateLimitError, OBPTimeoutError } from '$lib/obp/errors';
import { env } from '$env/dynamic/private';

const API_VERSION = 'v6.0.0';

interface EndpointInfo {
	operation_id: string;
	request_verb?: string;
	request_url?: string;
	summary?: string;
	description_markdown?: string;
	tags?: string[];
}

/**
 * Parse product attributes into a structured APIProductDetails object.
 * Handles both field names: 'product_attributes' (from getProducts list)
 * and 'attributes' (from getProduct single endpoint).
 * Also handles alternative attribute names used in the OBP API.
 */
function parseProductAttributes(product: OBPProduct): APIProductDetails {
	const details: APIProductDetails = {
		product
	};

	const attrs = product.product_attributes || (product as any).attributes || [];

	for (const attr of attrs) {
		switch (attr.name.toLowerCase()) {
			case 'api_collection_id':
				details.apiCollectionId = attr.value;
				break;
			case 'stripe_price_id':
				details.stripePriceId = attr.value;
				break;
			case 'rate_limit_per_minute':
			case 'calls_per_minute':
				details.rateLimitPerMinute = parseInt(attr.value, 10) || undefined;
				break;
			case 'rate_limit_per_day':
			case 'calls_per_day':
				details.rateLimitPerDay = parseInt(attr.value, 10) || undefined;
				break;
			case 'features':
				try {
					details.features = JSON.parse(attr.value);
				} catch {
					details.features = attr.value.split(',').map((f: string) => f.trim());
				}
				break;
			case 'price_monthly':
			case 'monthly_subscription_amount':
				details.priceMonthly = parseFloat(attr.value) || undefined;
				break;
			case 'price_currency':
			case 'monthly_subscription_currency':
				details.priceCurrency = attr.value;
				break;
		}
	}

	return details;
}

export async function load(event: RequestEvent) {
	const productCode = event.params.product_code;
	const apiExplorerUrl = env.API_EXPLORER_URL || '';
	const token = event.locals.session?.data?.oauth?.access_token;

	if (!productCode) {
		error(400, { message: 'Product code is required' });
	}

	// Fetch the specific product by scanning all banks
	let product: APIProductDetails | null = null;

	// First, get all banks
	let banks: Array<{ id: string }> = [];
	try {
		const banksResponse = await obp_requests.get(`/obp/${API_VERSION}/banks`);
		const rawBanks = banksResponse?.banks || [];
		banks = rawBanks.map((b: any) => ({ id: b.id || b.bank_id }));
	} catch (e) {
		logger.error('Error fetching banks:', e);
		error(500, { message: 'Could not fetch banks list.' });
	}

	// Search for the product across all banks using the API Products endpoint
	for (const bank of banks) {
		try {
			const apiProductResponse = await obp_requests.get(
				`/obp/${API_VERSION}/banks/${bank.id}/api-products/${productCode}`,
				token
			);

			if (apiProductResponse) {
				const obpProduct: OBPProduct = {
					bank_id: apiProductResponse.bank_id,
					product_code: apiProductResponse.api_product_code,
					parent_product_code: apiProductResponse.parent_api_product_code,
					name: apiProductResponse.name,
					more_info_url: apiProductResponse.more_info_url,
					terms_and_conditions_url: apiProductResponse.terms_and_conditions_url,
					description: apiProductResponse.description,
					meta: apiProductResponse.meta,
					product_attributes: apiProductResponse.attributes || []
				};

				product = parseProductAttributes(obpProduct);
				logger.info(`Found API product ${productCode} in bank ${bank.id}`);
				break;
			}
		} catch (e) {
			// Product not found in this bank, continue searching
		}
	}

	if (!product) {
		error(404, { message: `Product not found: ${productCode}` });
	}

	// Fetch endpoints if the product has an API collection
	let endpoints: EndpointInfo[] = [];
	let endpointCount = 0;

	if (product.apiCollectionId) {
		try {
			const endpointsResponse: OBPApiCollectionEndpointsResponse = await obp_requests.get(
				`/obp/${API_VERSION}/api-collections/${product.apiCollectionId}/api-collection-endpoints`
			);

			if (endpointsResponse?.api_collection_endpoints) {
				endpointCount = endpointsResponse.api_collection_endpoints.length;

				// Enrich endpoints with resource docs
				try {
					const resourceDocs = await obp_requests.get(
						`/obp/${API_VERSION}/resource-docs/${API_VERSION}/obp`,
						token
					);

					if (resourceDocs?.resource_docs) {
						const docsMap = new Map<string, any>();
						for (const doc of resourceDocs.resource_docs) {
							docsMap.set(doc.operation_id, doc);
						}

						// Helper to extract function name from operation_id
						const getFunctionName = (opId: string): string => {
							const match = opId.match(/^OBPv[\d.]+-(.+)$/);
							return match ? match[1] : opId;
						};

						// Create fallback lookup by function name
						const docsByFunctionName = new Map<string, any>();
						for (const doc of resourceDocs.resource_docs) {
							const funcName = getFunctionName(doc.operation_id);
							if (!docsByFunctionName.has(funcName)) {
								docsByFunctionName.set(funcName, doc);
							}
						}

						for (const ep of endpointsResponse.api_collection_endpoints) {
							let doc = docsMap.get(ep.operation_id);
							if (!doc) {
								const funcName = getFunctionName(ep.operation_id);
								doc = docsByFunctionName.get(funcName);
							}

							endpoints.push({
								operation_id: ep.operation_id,
								request_verb: doc?.request_verb || 'GET',
								request_url: doc?.specified_url || doc?.request_url || '',
								summary: doc?.summary || '',
								description_markdown: doc?.description?.markdown || '',
								tags: doc?.tags || []
							});
						}
					}
				} catch (e) {
					logger.warn('Could not fetch resource docs for enrichment:', e);
					// Use basic endpoint info without enrichment
					endpoints = endpointsResponse.api_collection_endpoints.map(ep => ({
						operation_id: ep.operation_id
					}));
				}
			}
		} catch (e) {
			logger.warn(`Could not fetch endpoints for collection ${product.apiCollectionId}:`, e);
		}
	}

	// Sort endpoints by operation_id
	endpoints.sort((a, b) => a.operation_id.localeCompare(b.operation_id));

	// Check if user is logged in
	const isLoggedIn = !!token;

	return {
		product,
		endpoints,
		endpointCount,
		apiExplorerUrl,
		isLoggedIn
	};
}
