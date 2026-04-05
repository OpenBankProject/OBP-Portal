import { createLogger } from '$lib/utils/logger';
const logger = createLogger('ChatJoinServer');
import type { RequestEvent, Actions } from '@sveltejs/kit';
import { redirect, error, isRedirect } from '@sveltejs/kit';
import { obp_requests } from '$lib/obp/requests';
import { OBPRequestError } from '$lib/obp/errors';

/**
 * Extract the raw joining key from user input.
 * Accepts either a raw key or a full join URL containing ?key=...
 */
function extractKey(input: string): string {
	try {
		const url = new URL(input);
		const keyParam = url.searchParams.get('key');
		if (keyParam) return keyParam;
	} catch {
		// Not a URL — treat as raw key
	}
	return input;
}

async function joinWithKey(key: string, token: string) {
	logger.info('Attempting to join chat room with key:', key);
	return await obp_requests.post(
		'/obp/v6.0.0/chat-room-participants',
		{ joining_key: key },
		token
	);
}

export async function load(event: RequestEvent) {
	const token = event.locals.session.data.oauth?.access_token;
	if (!token) {
		error(401, { message: 'Unauthorized: No access token found in session.' });
	}

	const key = event.url.searchParams.get('key');
	if (!key) {
		return { showForm: true };
	}

	try {
		const participant = await joinWithKey(key, token);
		redirect(303, `/user/chat/${participant.chat_room_id}`);
	} catch (e) {
		if (isRedirect(e)) throw e;

		logger.error('Error joining chat room:', e);
		if (e instanceof OBPRequestError) {
			if (e.message.includes('already a participant')) {
				return { showForm: true, alreadyJoined: true, errorMessage: e.message };
			}
			return { showForm: true, errorMessage: e.message };
		}
		return { showForm: true, errorMessage: 'Could not join chat room. Please try again later.' };
	}
}

export const actions = {
	join: async ({ request, locals }) => {
		const token = locals.session.data.oauth?.access_token;
		if (!token) {
			return { error: 'No access token found in session.' };
		}

		const formData = await request.formData();
		const rawInput = formData.get('key')?.toString()?.trim();

		if (!rawInput) {
			return { error: 'Please enter a joining key or join link.' };
		}

		const key = extractKey(rawInput);

		try {
			const participant = await joinWithKey(key, token);
			redirect(303, `/user/chat/${participant.chat_room_id}`);
		} catch (e) {
			if (isRedirect(e)) throw e;

			logger.error('Error joining chat room:', e);
			let errorMessage = 'Could not join chat room. Please try again.';
			if (e instanceof OBPRequestError) {
				errorMessage = e.message;
			}
			return { error: errorMessage };
		}
	}
} satisfies Actions;
