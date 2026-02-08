import { createLogger } from '$lib/utils/logger';
const logger = createLogger('ProductDetailServer');

import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import type { OBPProduct, OBPProductsResponse, APIProductDetails, OBPApiCollectionEndpointsResponse } from '$lib/obp/types';
import { obp_requests } from '$lib/obp/requests';
import { OBPRequestError, OBPErrorBase } from '$lib/obp/errors';
import { env } from '$env/dynamic/private';

const API_VERSION = 'v6.0.0';

interface EndpointInfo {
	operation_id: string;
	request_verb?: string;
	request_url?: string;
	summary?: string;
}

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

	// Search for the product across all banks using the products listing endpoint
	for (const bank of banks) {
		try {
			const productsResponse: OBPProductsResponse = await obp_requests.get(
				`/obp/${API_VERSION}/banks/${bank.id}/products`
			);

			if (productsResponse?.products) {
				const matchingProduct = productsResponse.products.find(
					(p: OBPProduct) => p.product_code === productCode
				);

				if (matchingProduct) {
					// Fetch attributes if not included
					if (!matchingProduct.product_attributes || matchingProduct.product_attributes.length === 0) {
						try {
							const attrsResponse = await obp_requests.get(
								`/obp/${API_VERSION}/banks/${bank.id}/products/${productCode}/attributes`
							);
							if (attrsResponse?.product_attributes) {
								matchingProduct.product_attributes = attrsResponse.product_attributes;
							}
						} catch (e) {
							logger.warn(`Could not fetch attributes for product ${productCode}:`, e);
						}
					}

					product = parseProductAttributes(matchingProduct);
					logger.info(`Found product ${productCode} in bank ${bank.id}`);
					break;
				}
			}
		} catch (e) {
			// Products not available in this bank, continue searching
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
								summary: doc?.summary || ''
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
