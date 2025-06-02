import { OAuth2Client } from "arctic";
import { OBP_OAUTH_CLIENT_ID, OBP_OAUTH_CLIENT_SECRET, OBP_OAUTH_WELL_KNOWN_URL, APP_CALLBACK_URL } from "$env/static/private";

interface OpenIdConnectConfiguration {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    userinfo_endpoint: string;
    jwks_uri: string;
    revocation_endpoint?: string;
    introspection_endpoint?: string;
    device_authorization_endpoint?: string;
    end_session_endpoint?: string;
    check_session_iframe?: string;
    frontchannel_logout_supported?: boolean;
    frontchannel_logout_session_required?: boolean;
    backchannel_logout_supported?: boolean;
    backchannel_logout_session_required?: boolean;
    scopes_supported?: string[];
    response_types_supported: string[];
    response_modes_supported?: string[];
    grant_types_supported: string[];
    acr_values_supported?: string[];
    subject_types_supported: string[];
    id_token_signing_alg_values_supported: string[];
    id_token_encryption_alg_values_supported?: string[];
    id_token_encryption_enc_values_supported?: string[];
    userinfo_signing_alg_values_supported?: string[];
    userinfo_encryption_alg_values_supported?: string[];
    userinfo_encryption_enc_values_supported?: string[];
    request_object_signing_alg_values_supported?: string[];
    request_object_encryption_alg_values_supported?: string[];
    request_object_encryption_enc_values_supported?: string[];
    token_endpoint_auth_methods_supported?: string[];
    token_endpoint_auth_signing_alg_values_supported?: string[];
    display_values_supported?: string[];
    claim_types_supported?: string[];
    claims_supported?: string[];
    service_documentation?: string;
    claims_locales_supported?: string[];
    ui_locales_supported?: string[];
    op_policy_uri?: string;
    op_tos_uri?: string;
    registration_endpoint?: string;
    dpop_signing_alg_values_supported?: string[];
  }

class OAuth2ClientWithConfig extends OAuth2Client {
    OIDCConfig?: OpenIdConnectConfiguration;
    wellKnownUrl: string;

    constructor(clientId: string, clientSecret: string, redirectUri: string, wellKnownUrl: string) {
        super(clientId, clientSecret, redirectUri);

        // get the OIDC configuration from the well-known URL if provided
        this.wellKnownUrl = wellKnownUrl;

    }

    async initOIDCConfig(): Promise<void> {
        console.group("--------------OAuth2Client----------------")
        console.log("Initializing OIDC configuration from well-known URL:", this.wellKnownUrl);
        try {
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

    createAuthorizationURL(authEndpoint: string, state: string, scopes: string[]): URL {
        return super.createAuthorizationURL(authEndpoint, state, scopes);
    }
}


export const obp_oauth = new OAuth2ClientWithConfig(OBP_OAUTH_CLIENT_ID, OBP_OAUTH_CLIENT_SECRET, APP_CALLBACK_URL, OBP_OAUTH_WELL_KNOWN_URL);