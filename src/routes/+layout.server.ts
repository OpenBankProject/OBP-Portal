import { createLogger } from '$lib/utils/logger';
const logger = createLogger('LayoutServer');
import type { RequestEvent } from "@sveltejs/kit";
import { obpIntegrationService } from '$lib/opey/services/OBPIntegrationService';
import type { OBPConsentInfo } from '$lib/obp/types';
import { obp_requests } from '$lib/obp/requests';
// import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
// import { storePopup } from '@skeletonlabs/skeleton';
// storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });

import { env } from "$env/dynamic/private";
import { env as publicEnv } from '$env/dynamic/public';

export interface RootLayoutData {
    userId?: string;
    email?: string;
    username?: string;
    opeyConsentInfo?: OBPConsentInfo;
    externalLinks: Record<string, string>;
    showEarlyAccess?: boolean;
    totalUnreadCount?: number;
}

export async function load(event: RequestEvent) {
	const { session } = event.locals;

	let data: Partial<RootLayoutData> = {};

	let externalLinks = {
		API_EXPLORER_URL: env.API_EXPLORER_URL,
		API_MANAGER_URL: env.API_MANAGER_URL,
		SANDBOX_POPULATOR_URL: env.SANDBOX_POPULATOR_URL,
		SUBSCRIPTIONS_URL: publicEnv.PUBLIC_SUBSCRIPTIONS_URL,
		LEGACY_PORTAL_URL: publicEnv.PUBLIC_LEGACY_PORTAL_URL
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

	// Only treat the user as logged in if they have both user data and a valid access token
    if (session?.data?.user && session?.data?.oauth?.access_token) {
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

	// Check if user has EARLY_ACCESS personal data field set to YES
	let showEarlyAccess = false;
	let totalUnreadCount = 0;
	const accessToken = session?.data?.oauth?.access_token;
	if (accessToken) {
		try {
			const [personalDataResponse, unreadResponse] = await Promise.all([
				obp_requests.get('/obp/v6.0.0/my/personal-data-fields', accessToken).catch(() => ({ user_attributes: [] })),
				obp_requests.get('/obp/v6.0.0/users/current/chat-rooms/unread', accessToken).catch(() => ({ unread_counts: [] }))
			]);
			const fields = personalDataResponse.user_attributes || [];
			showEarlyAccess = fields.some(
				(f: { name: string; value: string }) => f.name === 'EARLY_ACCESS' && f.value === 'YES'
			);
			const unreadCounts = unreadResponse.unread_counts || [];
			totalUnreadCount = unreadCounts.reduce((sum: number, uc: any) => sum + (uc.unread_count || 0), 0);
		} catch (error) {
			logger.debug('Could not fetch layout data:', error);
		}
	}

	return {
		...data,
		externalLinks: validExternalLinks,
		showEarlyAccess,
		totalUnreadCount
	} as RootLayoutData
}
