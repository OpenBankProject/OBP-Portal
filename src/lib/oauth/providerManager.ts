import { createLogger } from '$lib/utils/logger';
import { obp_requests } from '$lib/obp/requests';
import { oauth2ProviderFactory, type WellKnownUri } from '$lib/oauth/providerFactory';
import { PUBLIC_OBP_BASE_URL } from '$env/static/public';

const logger = createLogger('OAuthProviderManager');

interface OAuthProviderStatus {
	ready: boolean;
	error?: any;
	initializedProviders: WellKnownUri[];
}

class OAuth2ProviderManager {
	private status: OAuthProviderStatus = {
		ready: false,
		initializedProviders: []
	};
	private retryIntervalId: NodeJS.Timeout | null = null;
	private retryIntervalMs: number = 30000; // Retry every 30 seconds

	/**
	 * Fetches all well-known URIs from the OBP API
	 */
	async fetchWellKnownUris(): Promise<WellKnownUri[]> {
		try {
			const response = await obp_requests.get('/obp/v5.1.0/well-known');
			return response.well_known_uris;
		} catch (error) {
			logger.error('Failed to fetch well-known URIs:', error);
			throw error;
		}
	}

	/**
	 * Initializes all available OAuth2 providers from well-known URIs
	 * Handles routing based on provider count:
	 * - 1 provider: redirects directly to login
	 * - 2+ providers: returns providers for user selection
	 */
	async initOauth2Providers() {
		const initializedProviders: WellKnownUri[] = [];

		try {
			const wellKnownUris: WellKnownUri[] = await this.fetchWellKnownUris();
			logger.debug('Well-known URIs fetched successfully:', wellKnownUris);

			for (const providerUri of wellKnownUris) {
				const oauth2Client = await oauth2ProviderFactory.initializeProvider(providerUri);
				if (oauth2Client) {
					initializedProviders.push(providerUri);
				}
			}

			for (const registeredStrategy of oauth2ProviderFactory.getSupportedProviders()) {
				if (!initializedProviders.find((p) => p.provider === registeredStrategy)) {
					logger.warn(
						`No OAuth2 provider initialized for registered strategy: ${registeredStrategy}`
					);
				}
			}

			// If no providers were found, log error and return
			if (initializedProviders.length === 0) {
				logger.error(
					'Could not initialize any OAuth2 provider. Please check your OBP configuration.'
				);
				throw new Error('No OAuth2 providers could be initialized');
			}

			// Handle single provider case - could redirect directly
			if (initializedProviders.length === 1) {
				logger.info(`Single OAuth2 provider initialized: ${initializedProviders[0].provider}`);
			}

			// Handle multiple providers case - user needs to choose
			if (initializedProviders.length > 1) {
				logger.info(
					`Multiple OAuth2 providers initialized: ${initializedProviders.map((p) => p.provider).join(', ')}`
				);
			}

			return initializedProviders;
		} catch (error) {
			logger.error('Failed to init OAuth2 providers: ', error);
			throw error;
		}
	}

	/**
	 * Attempts to initialize OAuth2 providers and updates status
	 */
	async tryInitOauth2Providers() {
		try {
			const providers = await this.initOauth2Providers();
			this.status = {
				ready: true,
				error: null,
				initializedProviders: providers
			};
			logger.info('OAuth2 providers initialized successfully.');

			// Clear retry interval if it exists
			if (this.retryIntervalId) {
				clearInterval(this.retryIntervalId);
				this.retryIntervalId = null;
			}

			return providers;
		} catch (error) {
			this.status = {
				ready: false,
				error: error,
				initializedProviders: []
			};
			logger.error('Error initializing OAuth2 providers:', error);
			return [];
		}
	}

	/**
	 * Starts the initialization process with automatic retry
	 */
	async start() {
		await this.tryInitOauth2Providers();

		// Start retry interval if initialization failed
		if (!this.status.ready && !this.retryIntervalId) {
			this.retryIntervalId = setInterval(async () => {
				if (!this.status.ready) {
					logger.info('Retrying OAuth2 providers initialization...');
					await this.tryInitOauth2Providers();
				}
			}, this.retryIntervalMs);
		}
	}

	/**
	 * Returns the current status of OAuth2 providers
	 */
	getStatus(): OAuthProviderStatus {
		return { ...this.status };
	}

	/**
	 * Returns if the OAuth2 providers are ready
	 */
	isReady(): boolean {
		return this.status.ready;
	}

	/**
	 * Returns the list of initialized providers
	 */
	getInitializedProviders(): WellKnownUri[] {
		return [...this.status.initializedProviders];
	}

	/**
	 * Returns a list of health check entries for the initialized providers
	 */
	getHealthCheckEntries() {
		return this.status.initializedProviders.map((wellKnown) => ({
			serviceName: `OAuth2: ${wellKnown.provider}`,
			url: wellKnown.url
		}));
	}

	/**
	 * Returns the number of initialized providers
	 */
	getProviderCount(): number {
		return this.status.initializedProviders.length;
	}

	/**
	 * Returns true if there's exactly one provider (should redirect directly)
	 */
	hasSingleProvider(): boolean {
		return this.getProviderCount() === 1;
	}

	/**
	 * Returns true if there are multiple providers (should show selection)
	 */
	hasMultipleProviders(): boolean {
		return this.getProviderCount() > 1;
	}

	/**
	 * Cleans up resources, like the retry interval
	 */
	shutdown() {
		if (this.retryIntervalId) {
			clearInterval(this.retryIntervalId);
			this.retryIntervalId = null;
		}
	}
}

export const oauth2ProviderManager = new OAuth2ProviderManager();
