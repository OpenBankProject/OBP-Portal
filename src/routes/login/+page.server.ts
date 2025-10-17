import { oauth2ProviderManager, type ProviderStatus } from '$lib/oauth/providerManager';
import { redirect } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async () => {
	const allProviders = oauth2ProviderManager.getAllProviders();
	const availableProviders = oauth2ProviderManager.getAvailableProviders();
	const unavailableProviders = oauth2ProviderManager.getUnavailableProviders();

	// If we have exactly 1 available provider, redirect directly to it
	if (availableProviders.length === 1) {
		throw redirect(302, `/login/${availableProviders[0].provider}`);
	}

	// Return all providers for user selection (0, 2+ available providers)
	return {
		allProviders,
		availableProviders,
		unavailableProviders,
		loading: false,
		lastUpdated: new Date().toISOString()
	};
};
