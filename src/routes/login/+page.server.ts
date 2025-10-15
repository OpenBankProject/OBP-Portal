import { oauth2ProviderManager, type ProviderStatus } from '$lib/oauth/providerManager';
import { redirect } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async () => {
	if (!oauth2ProviderManager.isReady()) {
		// If providers aren't ready yet, show loading state
		return {
			allProviders: [],
			availableProviders: [],
			unavailableProviders: [],
			loading: true
		};
	}

	const allProviders = oauth2ProviderManager.getAllProviders();
	const availableProviders = oauth2ProviderManager.getAvailableProviders();
	const unavailableProviders = oauth2ProviderManager.getUnavailableProviders();

	// Always show the login page with all providers (available and unavailable)
	// Users can see what's available and what's not

	// Return all providers for user selection
	return {
		allProviders,
		availableProviders,
		unavailableProviders,
		loading: false,
		lastUpdated: new Date().toISOString()
	};
};
