import { createLogger } from '$lib/utils/logger';
const logger = createLogger('LayoutServer');
import type { RequestEvent } from "@sveltejs/kit";
import { obpIntegrationService } from '$lib/opey/services/OBPIntegrationService';
import type { OBPConsentInfo } from '$lib/obp/types';
// import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
// import { storePopup } from '@skeletonlabs/skeleton';
// storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });
			
import { env } from "$env/dynamic/private";

export interface RootLayoutData {
    userId?: string;
    email?: string;
    username?: string;
    opeyConsentInfo?: OBPConsentInfo;
    externalLinks: Record<string, string>;
}

export async function load(event: RequestEvent) {
	const { session } = event.locals;

	let data: Partial<RootLayoutData> = {};

	let externalLinks = {
		API_EXPLORER_URL: env.API_EXPLORER_URL,
		API_MANAGER_URL: env.API_MANAGER_URL,
		SUBSCRIPTIONS_URL: env.SUBSCRIPTIONS_URL
	};

	// Filter out undefined/null values and warn about missing ones
	const validExternalLinks: Record<string, string> = {};
	Object.entries(externalLinks).forEach(([name, url]) => {
		if (!url) {
			logger.warn(`Environment variable ${name} is not set, it will not show up in the menu.`);
		} else {
			validExternalLinks[name] = url;
		}
	});

	// Get information about the user from the session if they are logged in
    if (session?.data?.user) {
        data.userId = session.data.user.user_id;
        data.email = session.data.user.email;
        data.username = session.data.user.username;
    }

	// Get Opey consent info if we have Opey consumer ID configured
	try {
		const currentConsentInfo = await obpIntegrationService.getCurrentConsentInfo(session)
		if (currentConsentInfo) {
			data.opeyConsentInfo = currentConsentInfo;
		}
	} catch (error) {
		logger.error('Error fetching Opey consent info:', error);
	}

	return {
		...data,
		externalLinks: validExternalLinks
	} as RootLayoutData
}
