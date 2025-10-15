import { oauth2ProviderManager } from '$lib/oauth/providerManager';
import { redirect } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async () => {
	if (!oauth2ProviderManager.isReady()) {
		// If providers aren't ready yet, show loading state
		return {
			providers: [],
			loading: true
		};
	}

	const providers = oauth2ProviderManager.getInitializedProviders();

	// If we have exactly 1 provider, redirect directly to it
	if (providers.length === 1) {
		throw redirect(302, `/login/${providers[0].provider}`);
	}

	// Return providers for user selection (2+ providers case)
	return {
		providers: providers,
		loading: false
	};
};
