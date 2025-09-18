import { createLogger } from '$lib/utils/logger';
const logger = createLogger('OAuth2Client');
import { OAuth2Client } from 'arctic';
import type { OpenIdConnectConfiguration, OAuth2AccessTokenPayload } from '$lib/oauth/types';
import { jwtDecode } from 'jwt-decode';

export class OAuth2ClientWithConfig extends OAuth2Client {
	OIDCConfig?: OpenIdConnectConfiguration;
	private _clientSecret: string;
	private _redirectUri: string;

	constructor(clientId: string, clientSecret: string, redirectUri: string) {
		super(clientId, clientSecret, redirectUri);
		this._clientSecret = clientSecret;
		this._redirectUri = redirectUri;

		// get the OIDC configuration from the well-known URL if provided
	}

	async initOIDCConfig(OIDCConfigUrl: string): Promise<void> {
		logger.info('Initializing OIDC configuration from OIDC Config URL:', OIDCConfigUrl);
		let config: any;
		try {
			// Fetch OIDC configuration (OAuth2.1 compliant)
			const response = await fetch(OIDCConfigUrl);
			if (!response.ok) {
				logger.error(`Failed to fetch OIDC config: ${response.status} ${response.statusText}`);
				return;
			}
			config = await response.json();
			logger.debug('Raw OIDC config received:', JSON.stringify(config, null, 2));
		} catch (error) {
			throw new Error(`Error fetching OIDC config: ${error}`);
		}

		// Validate required endpoints outside of try/catch to avoid local-catch warnings
		if (!config?.authorization_endpoint || !config?.token_endpoint) {
			logger.error('Invalid OIDC config: Missing required endpoints.');
			logger.error(`Authorization endpoint: ${config?.authorization_endpoint || 'MISSING'}`);
			logger.error(`Token endpoint: ${config?.token_endpoint || 'MISSING'}`);
			return;
		}

		// Assign after validation
		this.OIDCConfig = config as OpenIdConnectConfiguration;
		logger.info('OIDC config initialization success.');
		logger.debug(`Configured authorization endpoint: ${this.OIDCConfig.authorization_endpoint}`);
		logger.debug(`Configured token endpoint: ${this.OIDCConfig.token_endpoint}`);
	}

	async checkAccessTokenExpiration(accessToken: string): Promise<boolean> {
		// Returns true if the access token is expired, false if it is valid
		logger.debug('Checking access token expiration...');
		try {
			const payload = jwtDecode(accessToken) as OAuth2AccessTokenPayload;
			if (!payload || !payload.exp) {
				logger.warn('Access token payload is invalid or missing expiration.');
				return false;
			}
			const isExpired = Date.now() >= payload.exp * 1000;
			logger.debug(`Access token is ${isExpired ? 'expired' : 'valid'}.`);
			return isExpired;
		} catch (error) {
			logger.error('Error decoding access token:', error);
			throw error;
		}
	}

	createAuthorizationURL(authEndpoint: string, state: string, scopes: string[]): URL {
		return super.createAuthorizationURL(authEndpoint, state, scopes);
	}

	async validateAuthorizationCode(
		tokenEndpoint: string,
		code: string,
		codeVerifier: string | null
	): Promise<any> {
		logger.debug('Validating authorization code with explicit client_id');

		const body = new URLSearchParams();
		body.set('grant_type', 'authorization_code');
		body.set('code', code);
		body.set('redirect_uri', this._redirectUri);
		body.set('client_id', this.clientId);

		if (this._clientSecret) {
			body.set('client_secret', this._clientSecret);
		}

		if (codeVerifier) {
			body.set('code_verifier', codeVerifier);
		}

		logger.debug(`Token request body: ${body.toString()}`);

		const response = await fetch(tokenEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json'
			},
			body: body.toString()
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			logger.error(`Token endpoint error - Status: ${response.status}, Data:`, errorData);
			throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
		}

		const tokens = await response.json();
		logger.debug('Token response received successfully');

		return {
			accessToken: () => tokens.access_token,
			refreshToken: () => tokens.refresh_token,
			accessTokenExpiresAt: () =>
				tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
		};
	}
}
