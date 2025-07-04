import { OAuth2Client } from "arctic";
import { env } from "$env/dynamic/private";
import type { OpenIdConnectConfiguration, OAuth2AccessTokenPayload } from "$lib/oauth/types";
import { jwtDecode } from "jwt-decode";

export class OAuth2ClientWithConfig extends OAuth2Client {
    wellKnownUrl: string;
    OIDCConfig?: OpenIdConnectConfiguration;

    constructor(clientId: string, clientSecret: string, redirectUri: string, wellKnownUrl: string) {
        super(clientId, clientSecret, redirectUri);

        // get the OIDC configuration from the well-known URL if provided
        this.wellKnownUrl = wellKnownUrl;

    }

    async initOIDCConfig(): Promise<void> {
        console.group("--------------OAuth2Client----------------")
        console.log("Initializing OIDC configuration from well-known URL:", this.wellKnownUrl);
        try {
            // Get the OIDC configuration from the well-known URL, this is OAuth2.1 compliant
            const response = await fetch(this.wellKnownUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch OIDC config: ${response.statusText}`);
            }
            const config = await response.json();
            if (!config.authorization_endpoint || !config.token_endpoint) {
                throw new Error("Invalid OIDC config: Missing required endpoints.");
            }
            console.debug("Fetched OIDC config success.")
            // try to validate the config using the OpenID Connect specification
            this.OIDCConfig = config as OpenIdConnectConfiguration;

        } catch (error) {
            console.error("Error fetching OIDC config:", error);
            throw error;
        }
        console.groupEnd();
    }

    async checkAccessTokenExpiration(accessToken: string): Promise<boolean> {
        // Returns true if the access token is expired, false if it is valid
        console.debug("Checking access token expiration...");
        try {
            const payload = jwtDecode(accessToken) as OAuth2AccessTokenPayload;
            if (!payload || !payload.exp) {
                console.warn("Access token payload is invalid or missing expiration.");
                return false;
            }
            const isExpired = Date.now() >= payload.exp * 1000;
            console.debug(`Access token is ${isExpired ? "expired" : "valid"}.`);
            return isExpired;
        } catch (error) {
            console.error("Error decoding access token:", error);
            throw error;
        }
    }

    createAuthorizationURL(authEndpoint: string, state: string, scopes: string[]): URL {
        return super.createAuthorizationURL(authEndpoint, state, scopes);
    }
}


export const obp_oauth = new OAuth2ClientWithConfig(env.OBP_OAUTH_CLIENT_ID, env.OBP_OAUTH_CLIENT_SECRET, env.APP_CALLBACK_URL, env.OBP_OAUTH_WELL_KNOWN_URL);