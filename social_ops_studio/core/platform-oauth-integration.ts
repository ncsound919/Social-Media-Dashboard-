/**
 * Platform OAuth Integration Helper
 * Provides OAuth 2.0 with PKCE authentication functionality for platform adapters
 */

import { Platform } from '@/data/models';
import { oauthService, OAuthTokens } from './oauth-service';
import { getOAuthEndpoints, getRedirectUri } from './platform-oauth-config';
import { platformConfig } from './config';
import { logger } from '@/utils/logging';

export interface PlatformOAuthConfig {
  clientId: string;
  clientSecret?: string;
  platform: Platform;
}

/**
 * OAuth integration class for platform adapters
 */
export class PlatformOAuthIntegration {
  private platform: Platform;
  private clientId: string;
  private clientSecret?: string;
  private tokens?: OAuthTokens;

  constructor(config: PlatformOAuthConfig) {
    this.platform = config.platform;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  /**
   * Initiate OAuth authorization flow
   * Returns the URL to redirect the user to for authorization
   */
  async authorize(): Promise<string> {
    const endpoints = getOAuthEndpoints(this.platform);
    if (!endpoints) {
      throw new Error(`OAuth endpoints not configured for platform: ${this.platform}`);
    }

    const redirectUri = getRedirectUri();
    
    const authUrl = await oauthService.startAuthorizationFlow(
      this.platform,
      this.clientId,
      endpoints.authorizationEndpoint,
      redirectUri,
      endpoints.scopes
    );

    logger.info('OAuth authorization initiated', { platform: this.platform });
    return authUrl;
  }

  /**
   * Complete OAuth flow by exchanging authorization code for tokens
   */
  async handleCallback(code: string, state: string): Promise<OAuthTokens> {
    const endpoints = getOAuthEndpoints(this.platform);
    if (!endpoints) {
      throw new Error(`OAuth endpoints not configured for platform: ${this.platform}`);
    }

    this.tokens = await oauthService.exchangeCodeForToken(
      code,
      state,
      endpoints.tokenEndpoint,
      this.clientId,
      this.clientSecret
    );

    logger.info('OAuth tokens obtained', { platform: this.platform });
    return this.tokens;
  }

  /**
   * Get current access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('Not authenticated - call authorize() first');
    }

    // Check if token is expired and refresh if needed
    if (oauthService.isTokenExpired(this.tokens.expiresAt)) {
      if (!this.tokens.refreshToken) {
        throw new Error('Access token expired and no refresh token available');
      }

      logger.info('Access token expired, refreshing', { platform: this.platform });
      
      const endpoints = getOAuthEndpoints(this.platform);
      if (!endpoints) {
        throw new Error(`OAuth endpoints not configured for platform: ${this.platform}`);
      }

      this.tokens = await oauthService.refreshAccessToken(
        this.tokens.refreshToken,
        endpoints.tokenEndpoint,
        this.clientId,
        this.clientSecret
      );
    }

    return this.tokens.accessToken;
  }

  /**
   * Set tokens (for loading previously stored tokens)
   */
  setTokens(tokens: OAuthTokens): void {
    this.tokens = tokens;
  }

  /**
   * Get current tokens (for storing)
   */
  getTokens(): OAuthTokens | undefined {
    return this.tokens;
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    if (!this.tokens) {
      return false;
    }
    
    // Check if token is not expired
    return !oauthService.isTokenExpired(this.tokens.expiresAt, 0);
  }

  /**
   * Revoke OAuth tokens and clear authentication
   */
  async revoke(): Promise<void> {
    if (!this.tokens) {
      return;
    }

    const endpoints = getOAuthEndpoints(this.platform);
    if (!endpoints?.revocationEndpoint) {
      logger.warn('Revocation endpoint not available', { platform: this.platform });
      this.tokens = undefined;
      return;
    }

    try {
      await oauthService.revokeToken(
        this.tokens.accessToken,
        endpoints.revocationEndpoint,
        this.clientId,
        this.clientSecret,
        'access_token'
      );

      if (this.tokens.refreshToken) {
        await oauthService.revokeToken(
          this.tokens.refreshToken,
          endpoints.revocationEndpoint,
          this.clientId,
          this.clientSecret,
          'refresh_token'
        );
      }
    } catch (error) {
      logger.error('Token revocation failed', { error, platform: this.platform });
    }

    this.tokens = undefined;
    logger.info('OAuth tokens revoked', { platform: this.platform });
  }
}

/**
 * Create OAuth integration for a platform
 */
export function createPlatformOAuth(platform: Platform): PlatformOAuthIntegration | null {
  let clientId: string | undefined;
  let clientSecret: string | undefined;

  switch (platform) {
    case 'twitter_x':
      clientId = platformConfig.twitter.clientId;
      clientSecret = platformConfig.twitter.clientSecret;
      break;
    case 'facebook_pages':
      clientId = platformConfig.facebook?.clientId;
      clientSecret = platformConfig.facebook?.clientSecret;
      break;
    case 'instagram_business':
      clientId = platformConfig.instagram.clientId;
      clientSecret = platformConfig.instagram.clientSecret;
      break;
    case 'tiktok':
      clientId = platformConfig.tiktok.clientId;
      clientSecret = platformConfig.tiktok.clientSecret;
      break;
    case 'youtube':
      clientId = platformConfig.youtube.clientId;
      clientSecret = platformConfig.youtube.clientSecret;
      break;
    default:
      logger.warn('OAuth not configured for platform', { platform });
      return null;
  }

  if (!clientId) {
    logger.warn('OAuth client ID not configured', { platform });
    return null;
  }

  return new PlatformOAuthIntegration({
    platform,
    clientId,
    clientSecret,
  });
}
