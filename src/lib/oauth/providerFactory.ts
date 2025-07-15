import { OAuth2ClientWithConfig } from "./client";
import { env } from "$env/dynamic/private";

export interface WellKnownUri {
    provider: string;
    url: string;
}

interface OAuth2ProviderStrategy {
    providerName: string;
    initialize(config: WellKnownUri): Promise<OAuth2ClientWithConfig>;
    supports(provider: string): boolean;
    getProviderName(): string;
}

class KeyCloakStrategy implements OAuth2ProviderStrategy {
    providerName = "keycloak";
    supports(provider: string): boolean {
        return provider === this.providerName;
    }

    getProviderName(): string {
        return this.providerName
    }

    async initialize(config: WellKnownUri): Promise<OAuth2ClientWithConfig> {
        const client = new OAuth2ClientWithConfig(
            env.OBP_OAUTH_CLIENT_ID,
            env.OBP_OAUTH_CLIENT_SECRET,
            env.APP_CALLBACK_URL
        )

        await client.initOIDCConfig(config.url);

        return client;
    }
}

export class OAuth2ProviderFactory {
    private strategies: OAuth2ProviderStrategy[] = [];
    private initializedClients = new Map<string, OAuth2ClientWithConfig>()

    constructor() {
        // Register any available strategies
        this.registerStrategy(new KeyCloakStrategy());
        // Add more as needed i.e. this.registerStrategy(new GoogleStrategy());
    }

    registerStrategy(strategy: OAuth2ProviderStrategy): void {
        this.strategies.push(strategy)
    }

    getStrategy(provider: string): OAuth2ProviderStrategy | undefined {
        return this.strategies.find(strategy => strategy.supports(provider))
    }

    async initializeProvider(config: WellKnownUri): Promise<OAuth2ClientWithConfig | null> {
        if (!config.provider || !config.url) {
            throw new Error(`Invalid configuration for OAuth2 provider: ${JSON.stringify(config)}`);
        }
        
        const strategy = this.getStrategy(config.provider);
        
        if (!strategy) {
            console.warn(`No strategy found for provider: ${config.provider}`);
            return null
        }

        try {
            const client = await strategy.initialize(config);
            this.initializedClients.set(strategy.getProviderName(), client)
            console.debug(`Initialized OAuth2 client for provider: ${config.provider}`);
            return client;
        } catch (error) {
            console.error(`Failed to initialize OAuth2 client for provider ${config.provider}:`, error);
            throw error;
        }
    }

    getPrimaryClient(): OAuth2ClientWithConfig | undefined {
        // Return the first initialized client as the primary client
        return this.initializedClients.values().next().value;
    }

    getClientCount(): number {
        return this.initializedClients.size;
    }

    hasAnyClients(): boolean {
        return this.initializedClients.size > 0;
    }

    getClient(provider: string): OAuth2ClientWithConfig | undefined {
        return this.initializedClients.get(provider);
    }

    getAllClients(): Map<string, OAuth2ClientWithConfig> {
        return new Map(this.initializedClients)
    }

    getSupportedProviders(): string[] {
        return this.strategies.map(strategy => strategy.getProviderName())
    }
}

export const oauth2ProviderFactory = new OAuth2ProviderFactory();