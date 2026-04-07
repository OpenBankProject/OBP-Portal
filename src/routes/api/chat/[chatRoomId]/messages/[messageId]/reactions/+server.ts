import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { obp_requests } from '$lib/obp/requests';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('ChatReactionsAPI');

export const GET: RequestHandler = async ({ locals, params }) => {
	const session = locals.session;
	if (!session?.data?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const accessToken = session.data.oauth?.access_token;
	const { chatRoomId, messageId } = params;

	try {
		const response = await obp_requests.get(
			`/obp/v6.0.0/chat-rooms/${chatRoomId}/messages/${messageId}/reactions`,
			accessToken
		);
		return json({ reactions: response.reactions || [] });
	} catch (error: any) {
		logger.error('Error fetching reactions:', error);
		return json(
			{ reactions: [], error: error.message || 'Failed to fetch reactions' },
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
	const { chatRoomId, messageId } = params;
	const body = await request.json();

	if (!body.emoji) {
		return json({ error: 'emoji is required' }, { status: 400 });
	}

	try {
		const reaction = await obp_requests.post(
			`/obp/v6.0.0/chat-rooms/${chatRoomId}/messages/${messageId}/reactions`,
			{ emoji: body.emoji },
			accessToken
		);
		return json(reaction, { status: 201 });
	} catch (error: any) {
		logger.error('Error adding reaction:', error);
		return json(
			{ error: error.message || 'Failed to add reaction' },
			{ status: error.code || 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ locals, params, request }) => {
	const session = locals.session;
	if (!session?.data?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const accessToken = session.data.oauth?.access_token;
	const { chatRoomId, messageId } = params;
	const body = await request.json();

	if (!body.emoji) {
		return json({ error: 'emoji is required' }, { status: 400 });
	}

	try {
		await obp_requests.delete(
			`/obp/v6.0.0/chat-rooms/${chatRoomId}/messages/${messageId}/reactions/${encodeURIComponent(body.emoji)}`,
			accessToken
		);
		return new Response(null, { status: 204 });
	} catch (error: any) {
		logger.error('Error removing reaction:', error);
		return json(
			{ error: error.message || 'Failed to remove reaction' },
			{ status: error.code || 500 }
		);
	}
};
