import { createLogger } from '$lib/utils/logger';
const logger = createLogger('UserPageServer');
import type { RequestEvent } from '@sveltejs/kit';

export function load(event: RequestEvent) {
	const session = event.locals.session;
	const userData = session?.data?.user;

	logger.debug('User data from session:', userData);

	if (userData) {
		return {
			userData
		};
	}

	return {
		userData: null
	};
}
