import { createLogger } from '$lib/utils/logger';
const logger = createLogger('LayoutServer');
import type { RequestEvent } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

export async function load(event: RequestEvent) {
    const { session } = event.locals;

	let data: Record<string, any> = {};

	const externalLinks = {
		API_EXPLORER_URL: env.API_EXPLORER_URL,
		API_MANAGER_URL: env.API_MANAGER_URL,
		SUBSCRIPTIONS_URL: env.SUBSCRIPTIONS_URL
	};

	// for each of the external links, check if the environment variable is set and add it to the data object
	Object.entries(externalLinks).forEach(([name, url]) => {
		if (!url) {
			logger.warn(`Environment variable ${name} is not set, it will not show up in the menu.`);
		}
		data[name] = url ? url : null;
	});

	// Get information about the user from the session if they are logged in
	// This will be used to display the user information in the header
	if (session?.data?.user) {
		const sessionData = {
			userId: session.data.user.user_id,
			email: session.data.user.email,
			username: session.data.user.username
		};

		data = { ...sessionData, ...data };
	}

	return data;
}
