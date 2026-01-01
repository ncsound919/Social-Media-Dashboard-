/**
 * OAuth 2.0 Service with PKCE Support
 * Implements OAuth 2.0 Authorization Code Flow with PKCE (RFC 7636)
 * for secure authentication with social media platforms
 */

import { logger } from '@/utils/logging';

// OAuth 2.0 token response interface
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

// OAuth state for PKCE flow
export interface OAuthState {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  platform: string;
  redirectUri: string;
  createdAt: number; // Timestamp for TTL cleanup
}

// Stored OAuth tokens
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope?: string;
}

// Default buffer time before token expiration to trigger refresh (5 minutes)
const DEFAULT_TOKEN_REFRESH_BUFFER_SECONDS = 300;

// TTL for pending OAuth states (10 minutes)
const PENDING_STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Generate a cryptographically random string for code verifier
 * As per RFC 7636, code verifier should be 43-128 characters
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Generate code challenge from verifier using SHA-256
 * As per RFC 7636 Section 4.2
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

/**
 * Base64 URL encode (without padding)
 * As per RFC 7636 Appendix A
 */
function base64URLEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a random state parameter for CSRF protection
 */
function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

export class OAuthService {
  private static instance: OAuthService;
  private pendingStates: Map<string, OAuthState> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start periodic cleanup of expired states
    this.startCleanupInterval();
  }

  static getInstance(): OAuthService {
    if (!OAuthService.instance) {
      OAuthService.instance = new OAuthService();
    }
    return OAuthService.instance;
  }

  /**
   * Clean up expired OAuth states to prevent memory leaks
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    const expiredStates: string[] = [];
    
    for (const [state, oauthState] of this.pendingStates.entries()) {
      if (now - oauthState.createdAt > PENDING_STATE_TTL_MS) {
        expiredStates.push(state);
      }
    }
    
    for (const state of expiredStates) {
      this.pendingStates.delete(state);
      logger.debug('Cleaned up expired OAuth state', { state });
    }
  }

  /**
   * Start interval to periodically clean up expired states
   */
  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredStates();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup interval (for testing or shutdown)
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Start OAuth 2.0 Authorization Code Flow with PKCE
   * Returns the authorization URL to redirect the user to
   */
  async startAuthorizationFlow(
    platform: string,
    clientId: string,
    authorizationEndpoint: string,
    redirectUri: string,
    scopes: string[]
  ): Promise<string> {
    logger.info('Starting OAuth flow with PKCE', { platform });

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store state for later verification
    const oauthState: OAuthState = {
      state,
      codeVerifier,
      codeChallenge,
      platform,
      redirectUri,
      createdAt: Date.now(),
    };
    this.pendingStates.set(state, oauthState);

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      scope: scopes.join(' '),
    });

    const authUrl = `${authorizationEndpoint}?${params.toString()}`;
    logger.info('Authorization URL generated', { platform, hasState: !!state });

    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   * Completes the OAuth 2.0 PKCE flow
   */
  async exchangeCodeForToken(
    authorizationCode: string,
    state: string,
    tokenEndpoint: string,
    clientId: string,
    clientSecret?: string
  ): Promise<OAuthTokens> {
    logger.info('Exchanging authorization code for token');

    // Verify state parameter
    const oauthState = this.pendingStates.get(state);
    if (!oauthState) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    // Build token request
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: oauthState.redirectUri,
      client_id: clientId,
      code_verifier: oauthState.codeVerifier,
    });

    // Add client secret if provided (for confidential clients)
    if (clientSecret) {
      params.append('client_secret', clientSecret);
    }

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
      }

      const tokenResponse: OAuthTokenResponse = await response.json();

      // Clean up used state
      this.pendingStates.delete(state);

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

      const tokens: OAuthTokens = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
        scope: tokenResponse.scope,
      };

      logger.info('Token exchange successful', { 
        platform: oauthState.platform,
        hasRefreshToken: !!tokens.refreshToken 
      });

      return tokens;
    } catch (error) {
      this.pendingStates.delete(state);
      logger.error('Token exchange failed', { error });
      throw error;
    }
  }

  /**
   * Refresh an expired access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    tokenEndpoint: string,
    clientId: string,
    clientSecret?: string
  ): Promise<OAuthTokens> {
    logger.info('Refreshing access token');

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    });

    if (clientSecret) {
      params.append('client_secret', clientSecret);
    }

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
      }

      const tokenResponse: OAuthTokenResponse = await response.json();

      const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

      const tokens: OAuthTokens = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || refreshToken,
        expiresAt,
        scope: tokenResponse.scope,
      };

      logger.info('Token refresh successful');

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed', { error });
      throw error;
    }
  }

  /**
   * Check if a token is expired or will expire soon
   */
  isTokenExpired(expiresAt: Date, bufferSeconds = DEFAULT_TOKEN_REFRESH_BUFFER_SECONDS): boolean {
    const now = new Date();
    const expirationTime = new Date(expiresAt);
    const bufferTime = new Date(expirationTime.getTime() - bufferSeconds * 1000);
    return now >= bufferTime;
  }

  /**
   * Revoke an OAuth token
   */
  async revokeToken(
    token: string,
    revocationEndpoint: string,
    clientId: string,
    clientSecret?: string,
    tokenTypeHint?: 'access_token' | 'refresh_token'
  ): Promise<void> {
    logger.info('Revoking OAuth token');

    const params = new URLSearchParams({
      token,
      client_id: clientId,
    });

    if (clientSecret) {
      params.append('client_secret', clientSecret);
    }

    if (tokenTypeHint) {
      params.append('token_type_hint', tokenTypeHint);
    }

    try {
      const response = await fetch(revocationEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn('Token revocation failed', { status: response.status, error: errorText });
      } else {
        logger.info('Token revoked successfully');
      }
    } catch (error) {
      logger.error('Token revocation error', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const oauthService = OAuthService.getInstance();
