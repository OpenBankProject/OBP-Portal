import { createLogger } from '$lib/utils/logger';
const logger = createLogger('FeaturedCollectionDetailServer');
import type { PageServerLoad } from './$types';
import type { OBPApiCollection, OBPApiCollectionEndpointsResponse } from '$lib/obp/types';
import { obp_requests } from '$lib/obp/requests';
import { error } from '@sveltejs/kit';

const API_VERSION = 'v6.0.0';

export const load: PageServerLoad = async ({ params }) => {
	const collectionId = params.collection_id;

	// Fetch the sharable collection details
	let collection: OBPApiCollection | undefined;
	try {
		collection = await obp_requests.get(
			`/obp/${API_VERSION}/api-collections/sharable/${collectionId}`
		);
	} catch (e) {
		logger.error('Error fetching sharable collection:', e);
		error(404, {
			message: 'Collection not found.'
		});
	}

	// Fetch endpoints in this collection
	let endpointsResponse: OBPApiCollectionEndpointsResponse | undefined;
	try {
		endpointsResponse = await obp_requests.get(
			`/obp/${API_VERSION}/api-collections/${collectionId}/api-collection-endpoints`
		);
	} catch (e) {
		logger.error('Error fetching collection endpoints:', e);
		// Don't fail, just return empty endpoints
	}

	const endpoints = endpointsResponse?.api_collection_endpoints || [];

	return {
		collection,
		endpoints,
		collectionId
	};
};
