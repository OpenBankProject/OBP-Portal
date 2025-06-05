import type { Session } from 'svelte-kit-sessions';
import { OAuth2ClientWithConfig } from './client';

export async function refreshAccessTokenInSession(session: Session, client: OAuth2ClientWithConfig): Promise<void> {
    console.debug('Attempting to refresh access token...');
            
    const refreshEndpoint = client.OIDCConfig?.token_endpoint;
    const refreshToken = session.data.oauth?.refresh_token;
    if (!refreshEndpoint || !refreshToken) {
        console.warn('No refresh endpoint or refresh token found. Redirecting to login.');
        throw new Error('No refresh endpoint or refresh token found. Please log in again.');
    }
    
    try {
        console.debug('Refreshing access token...');
        const tokens = await client.refreshAccessToken(refreshEndpoint, refreshToken, ['openid'])

        session.data.oauth = {
            access_token: tokens.accessToken(),
            refresh_token: tokens.refreshToken() || session.data.oauth?.refresh_token // Keep existing refresh token if not provided
        };
        await session.save();

    } catch (error) {
        console.error('Error refreshing access token:', error);
        throw new Error('Failed to refresh access token. Please log in again.');
    }
}