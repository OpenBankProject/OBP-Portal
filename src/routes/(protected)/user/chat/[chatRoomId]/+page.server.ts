import { createLogger } from '$lib/utils/logger';
const logger = createLogger('ChatRoomServer');
import type { RequestEvent } from '@sveltejs/kit';
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

	const chatRoomId = event.params.chatRoomId;

	try {
		const [chatRoom, messagesResponse, participantsResponse, unreadResponse] = await Promise.all([
			obp_requests.get(`/obp/v6.0.0/chat-rooms/${chatRoomId}`, token),
			obp_requests.get(`/obp/v6.0.0/chat-rooms/${chatRoomId}/messages`, token),
			obp_requests.get(`/obp/v6.0.0/chat-rooms/${chatRoomId}/participants`, token),
			obp_requests.get('/obp/v6.0.0/users/current/chat-rooms/unread', token).catch(() => ({ unread_counts: [] }))
		]);

		const unreadCounts = unreadResponse.unread_counts || [];
		const roomUnread = unreadCounts.find((uc: any) => uc.chat_room_id === chatRoomId);

		return {
			chatRoom,
			messages: messagesResponse.messages || [],
			participants: participantsResponse.participants || [],
			currentUserId: event.locals.session.data.user?.user_id || '',
			roomUnreadCount: roomUnread?.unread_count || 0
		};
	} catch (e) {
		logger.error('Error fetching chat room:', e);
		if (e instanceof OBPRequestError) {
			error(e.code >= 400 && e.code < 500 ? e.code : 500, {
				message: e.message
			});
		}
		error(500, {
			message: 'Could not fetch chat room at this time. Please try again later.'
		});
	}
}
