import { createLogger } from '$lib/utils/logger';
const logger = createLogger('UserApiCollectionDetailServer');
import type { RequestEvent, Actions } from '@sveltejs/kit';
import { error, fail } from '@sveltejs/kit';
import type { OBPApiCollection, OBPApiCollectionEndpointsResponse } from '$lib/obp/types';
import { obp_requests } from '$lib/obp/requests';
import { OBPRequestError } from '$lib/obp/errors';

const API_VERSION = 'v6.0.0';

export async function load(event: RequestEvent) {
	const token = event.locals.session.data.oauth?.access_token;
	if (!token) {
		error(401, {
			message: 'Unauthorized: No access token found in session.'
		});
	}

	const collectionId = event.params.collection_id;

	// Fetch collection details
	let collection: OBPApiCollection | undefined;
	try {
		collection = await obp_requests.get(
			`/obp/${API_VERSION}/my/api-collections/${collectionId}`,
			token
		);
	} catch (e) {
		logger.error('Error fetching API collection:', e);
		error(404, {
			message: 'API Collection not found.'
		});
	}

	// Fetch endpoints in this collection (using collection ID endpoint)
	let endpointsResponse: OBPApiCollectionEndpointsResponse | undefined;
	try {
		endpointsResponse = await obp_requests.get(
			`/obp/${API_VERSION}/my/api-collection-ids/${collectionId}/api-collection-endpoints`,
			token
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
}

export const actions = {
	addEndpoint: async ({ request, locals, params }) => {
		const data = await request.formData();
		const operationId = data.get('operation_id')?.toString();

		if (!operationId) {
			return fail(400, { error: 'Operation ID is required.' });
		}

		const token = locals.session.data.oauth?.access_token;
		if (!token) {
			return fail(401, { error: 'No access token found in session.' });
		}

		const collectionId = params.collection_id;

		try {
			await obp_requests.post(
				`/obp/${API_VERSION}/my/api-collection-ids/${collectionId}/api-collection-endpoints`,
				{ operation_id: operationId },
				token
			);
			return { success: true, message: 'Endpoint added successfully.' };
		} catch (err) {
			logger.error('Error adding endpoint to collection:', err);
			let errorMessage = 'Failed to add endpoint.';
			if (err instanceof OBPRequestError) {
				errorMessage = err.message;
			} else if (err instanceof Error) {
				errorMessage = err.message;
			}
			return fail(500, { error: errorMessage });
		}
	},

	removeEndpoint: async ({ request, locals, params }) => {
		const data = await request.formData();
		const endpointId = data.get('endpoint_id')?.toString();

		if (!endpointId) {
			return fail(400, { error: 'Endpoint ID is required.' });
		}

		const token = locals.session.data.oauth?.access_token;
		if (!token) {
			return fail(401, { error: 'No access token found in session.' });
		}

		const collectionId = params.collection_id;

		try {
			await obp_requests.delete(
				`/obp/${API_VERSION}/my/api-collection-ids/${collectionId}/api-collection-endpoint-ids/${endpointId}`,
				token
			);
			return { success: true, message: 'Endpoint removed successfully.' };
		} catch (err) {
			logger.error('Error removing endpoint from collection:', err);
			let errorMessage = 'Failed to remove endpoint.';
			if (err instanceof OBPRequestError) {
				errorMessage = err.message;
			} else if (err instanceof Error) {
				errorMessage = err.message;
			}
			return fail(500, { error: errorMessage });
		}
	},

	update: async ({ request, locals, params }) => {
		const data = await request.formData();
		const name = data.get('api_collection_name')?.toString();
		const description = data.get('description')?.toString() || '';
		const is_sharable = data.get('is_sharable') === 'true';

		if (!name) {
			return fail(400, { error: 'Collection name is required.' });
		}

		const token = locals.session.data.oauth?.access_token;
		if (!token) {
			return fail(401, { error: 'No access token found in session.' });
		}

		const collectionId = params.collection_id;

		try {
			await obp_requests.put(
				`/obp/${API_VERSION}/my/api-collections/${collectionId}`,
				{ api_collection_name: name, description, is_sharable },
				token
			);
			return { success: true, message: 'Collection updated successfully.' };
		} catch (err) {
			logger.error('Error updating API collection:', err);
			let errorMessage = 'Failed to update collection.';
			if (err instanceof OBPRequestError) {
				errorMessage = err.message;
			} else if (err instanceof Error) {
				errorMessage = err.message;
			}
			return fail(500, { error: errorMessage });
		}
	}
} satisfies Actions;
