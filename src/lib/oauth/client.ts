import { createLogger } from '$lib/utils/logger';
const logger = createLogger('OAuth2Client');
import { OAuth2Client } from "arctic";
import type { OpenIdConnectConfiguration, OAuth2AccessTokenPayload } from "$lib/oauth/types";
import { jwtDecode } from "jwt-decode";

export class OAuth2ClientWithConfig extends OAuth2Client {
    OIDCConfig?: OpenIdConnectConfiguration;

    constructor(clientId: string, clientSecret: string, redirectUri: string) {
        super(clientId, clientSecret, redirectUri);

        // get the OIDC configuration from the well-known URL if provided

    }

    async initOIDCConfig(OIDCConfigUrl: string): Promise<void> {
        logger.info("Initializing OIDC configuration from OIDC Config URL:", OIDCConfigUrl);
        let config: any;
        try {
            // Fetch OIDC configuration (OAuth2.1 compliant)
            const response = await fetch(OIDCConfigUrl);
            if (!response.ok) {
                logger.error(`Failed to fetch OIDC config: ${response.status} ${response.statusText}`);
                return;
            }
            config = await response.json();
        } catch (error) {
            logger.error("Error fetching OIDC config:", error);
            return;
        }

        // Validate required endpoints outside of try/catch to avoid local-catch warnings
        if (!config?.authorization_endpoint || !config?.token_endpoint) {
            logger.error("Invalid OIDC config: Missing required endpoints.");
            return;
        }

        // Assign after validation
        this.OIDCConfig = config as OpenIdConnectConfiguration;
        logger.info("OIDC config initialization success.")
    }

    async checkAccessTokenExpiration(accessToken: string): Promise<boolean> {
        // Returns true if the access token is expired, false if it is valid
        logger.debug("Checking access token expiration...");
        try {
            const payload = jwtDecode(accessToken) as OAuth2AccessTokenPayload;
            if (!payload || !payload.exp) {
                logger.warn("Access token payload is invalid or missing expiration.");
                return false;
            }
            const isExpired = Date.now() >= payload.exp * 1000;
            logger.debug(`Access token is ${isExpired ? "expired" : "valid"}.`);
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