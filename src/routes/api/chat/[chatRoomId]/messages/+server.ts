import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('ChatMessagesAPI');

export const GET: RequestHandler = async ({ locals, params, url }) => {
	const session = locals.session;
	if (!session?.data?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const accessToken = session.data.oauth?.access_token;
	const chatRoomId = params.chatRoomId;
	const fromDate = url.searchParams.get('from_date');

	let endpoint = `/obp/v6.0.0/chat-rooms/${chatRoomId}/messages`;
	if (fromDate) {
		endpoint += `?from_date=${encodeURIComponent(fromDate)}`;
	}

	try {
		const response = await obp_requests.get(endpoint, accessToken);
		return json({ messages: response.messages || [] });
	} catch (error: any) {
		logger.error('Error fetching messages:', error);
		return json(
			{ messages: [], error: error.message || 'Failed to fetch messages' },
			{ status: error.code || 500 }
		);
	}
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const session = locals.session;
	if (!session?.data?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const accessToken = session.data.oauth?.access_token;
	const chatRoomId = params.chatRoomId;
	const body = await request.json();

	try {
		const message = await obp_requests.post(
			`/obp/v6.0.0/chat-rooms/${chatRoomId}/messages`,
			{
				content: body.content,
				message_type: 'text',
				mentioned_user_ids: [],
				reply_to_message_id: '',
				thread_id: ''
			},
			accessToken
		);
		return json(message);
	} catch (error: any) {
		logger.error('Error sending message:', error);
		return json(
			{ error: error.message || 'Failed to send message' },
			{ status: error.code || 500 }
		);
	}
};
