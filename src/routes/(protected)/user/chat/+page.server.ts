import { createLogger } from '$lib/utils/logger';
const logger = createLogger('ChatRoomsServer');
import type { RequestEvent, Actions } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { obp_requests } from '$lib/obp/requests';
import { OBPRequestError } from '$lib/obp/errors';

export async function load(event: RequestEvent) {
	const token = event.locals.session.data.oauth?.access_token;
	if (!token) {
		error(401, {
			message: 'Unauthorized: No access token found in session.'
		});
	}

	try {
		const response = await obp_requests.get('/obp/v6.0.0/chat-rooms', token);
		return {
			chatRooms: response.chat_rooms || []
		};
	} catch (e) {
		logger.error('Error fetching chat rooms:', e);
		error(500, {
			message: 'Could not fetch chat rooms at this time. Please try again later.'
		});
	}
}

export const actions = {
	create: async ({ request, locals }) => {
		const token = locals.session.data.oauth?.access_token;
		if (!token) {
			return { error: 'No access token found in session.' };
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString()?.trim();
		const description = formData.get('description')?.toString()?.trim() || '';

		if (!name) {
			return { error: 'Chat room name is required.' };
		}

		try {
			const room = await obp_requests.post('/obp/v6.0.0/chat-rooms', { name, description }, token);
			return {
				success: true,
				message: 'Chat room created successfully.',
				createdRoom: room
			};
		} catch (err) {
			logger.error('Error creating chat room:', err);
			let errorMessage = 'Failed to create chat room.';
			if (err instanceof OBPRequestError) {
				errorMessage = err.message;
			}
			return { error: errorMessage };
		}
	}
} satisfies Actions;
