import { createLogger } from '../utils/logger';
const logger = createLogger('OAuth2Client');
import { OAuth2Client } from "arctic";
import { env } from "$env/dynamic/private";
import type { OpenIdConnectConfiguration, OAuth2AccessTokenPayload } from "$lib/oauth/types";
import { jwtDecode } from "jwt-decode";
import { oauth2ProviderFactory } from "./providerFactory";

export class OAuth2ClientWithConfig extends OAuth2Client {
    OIDCConfig?: OpenIdConnectConfiguration;

    constructor(clientId: string, clientSecret: string, redirectUri: string) {
        super(clientId, clientSecret, redirectUri);

        // get the OIDC configuration from the well-known URL if provided

    }

    async initOIDCConfig(OIDCConfigUrl: string): Promise<void> {
        logger.info("Initializing OIDC configuration from OIDC Config URL:", OIDCConfigUrl);
        try {
            // Get the OIDC configuration from the well-known URL, this is OAuth2.1 compliant
            const response = await fetch(OIDCConfigUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch OIDC config: ${response.statusText}`);
            }
            const config = await response.json();
            if (!config.authorization_endpoint || !config.token_endpoint) {
                throw new Error("Invalid OIDC config: Missing required endpoints.");
            }
            
            // try to validate the config using the OpenID Connect specification
            this.OIDCConfig = config as OpenIdConnectConfiguration;
            logger.info("OIDC config initialization success.")

        } catch (error) {
            logger.error("Error fetching OIDC config:", error);
            throw error;
        }
    }

    async checkAccessTokenExpiration(accessToken: string): Promise<boolean> {
        // Returns true if the access token is expired, false if it is valid
        console.debug("OAuth2Client: Checking access token expiration...");
        try {
            const payload = jwtDecode(accessToken) as OAuth2AccessTokenPayload;
            if (!payload || !payload.exp) {
                logger.warn("Access token payload is invalid or missing expiration.");
                return false;
            }
            const isExpired = Date.now() >= payload.exp * 1000;
            console.debug(`OAuth2Client: Access token is ${isExpired ? "expired" : "valid"}.`);
            return isExpired;
        } catch (error) {
            logger.error("Error decoding access token:", error);
            throw error;
        }
    }

    createAuthorizationURL(authEndpoint: string, state: string, scopes: string[]): URL {
        return super.createAuthorizationURL(authEndpoint, state, scopes);
    }
}