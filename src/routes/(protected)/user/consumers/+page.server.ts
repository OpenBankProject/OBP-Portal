import { createLogger } from '$lib/utils/logger';
import { obp_requests } from '$lib/obp/requests';
import { error } from '@sveltejs/kit';
import type { OBPConsumer } from '$lib/obp/types';
import type { RequestEvent } from '@sveltejs/kit';

const logger = createLogger('UserConsumersServer');

export async function load(event: RequestEvent) {
	const token = event.locals.session.data.oauth?.access_token;
	if (!token) {
		error(401, {
			message: 'Unauthorized: No access token found in session.'
		});
	}

	let consumersResponse: { consumers: OBPConsumer[] } | undefined = undefined;

	try {
		consumersResponse = await obp_requests.get('/obp/v6.0.0/management/users/current/consumers', token);
	} catch (e) {
		logger.error('Error fetching consumers:', e);
		error(500, {
			message: 'Could not fetch consumers at this time. Please try again later.'
		});
	}

	if (!consumersResponse || !consumersResponse.consumers) {
		error(500, {
			message: 'Could not fetch consumers at this time. Please try again later.'
		});
	}

	const consumers = consumersResponse.consumers;

	// Sort consumers by created date, most recent first
	consumers.sort((a: OBPConsumer, b: OBPConsumer) => {
		const dateA = a.created ? new Date(a.created).getTime() : 0;
		const dateB = b.created ? new Date(b.created).getTime() : 0;
		return dateB - dateA; // Most recent first
	});

	return {
		consumers
	};
}