import { createLogger } from '$lib/utils/logger';
const logger = createLogger('FeaturedCollectionsServer');
import type { PageServerLoad } from './$types';
import type { OBPApiCollectionsResponse } from '$lib/obp/types';
import { obp_requests } from '$lib/obp/requests';

const API_VERSION = 'v6.0.0';

export const load: PageServerLoad = async () => {
	let collectionsResponse: OBPApiCollectionsResponse | undefined = undefined;

	try {
		collectionsResponse = await obp_requests.get(`/obp/${API_VERSION}/api-collections/featured`);
	} catch (e) {
		logger.error('Error fetching featured API collections:', e);
		return { collections: [], error: 'Could not fetch featured collections at this time.' };
	}

	if (!collectionsResponse || !collectionsResponse.api_collections) {
		return { collections: [] };
	}

	return { collections: collectionsResponse.api_collections };
};
