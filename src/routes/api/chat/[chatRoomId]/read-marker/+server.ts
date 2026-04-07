import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('ChatReadMarkerAPI');

export const PUT: RequestHandler = async ({ locals, params }) => {
	const session = locals.session;
	if (!session?.data?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const accessToken = session.data.oauth?.access_token;
	const chatRoomId = params.chatRoomId;

	try {
		await obp_requests.put(
			`/obp/v6.0.0/users/current/chat-rooms/${chatRoomId}/read-marker`,
			{},
			accessToken
		);
		return new Response(null, { status: 204 });
	} catch (error: any) {
		logger.error('Error marking room as read:', error);
		return json(
			{ error: error.message || 'Failed to mark room as read' },
			{ status: error.code || 500 }
		);
	}
};
