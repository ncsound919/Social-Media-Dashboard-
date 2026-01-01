/**
 * Platform OAuth 2.0 Endpoints Configuration
 * Defines OAuth endpoints and scopes for each social media platform
 */

import { Platform } from '@/data/models';

export interface PlatformOAuthEndpoints {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint?: string;
  scopes: string[];
}

/**
 * OAuth 2.0 configuration for each platform
 * All platforms support OAuth 2.0 with PKCE
 */
export const platformOAuthEndpoints: Record<string, PlatformOAuthEndpoints> = {
  twitter_x: {
    authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize',
    tokenEndpoint: 'https://api.twitter.com/2/oauth2/token',
    revocationEndpoint: 'https://api.twitter.com/2/oauth2/revoke',
    scopes: [
      'tweet.read',
      'tweet.write',
      'users.read',
      'offline.access', // For refresh token
    ],
  },
  facebook_pages: {
    authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenEndpoint: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_read_user_content',
      'public_profile',
    ],
  },
  instagram_business: {
    // Instagram uses Facebook OAuth (Meta)
    authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenEndpoint: 'https://graph.facebook.com/v18.0/oauth/access_token',
    scopes: [
      'instagram_basic',
      'instagram_content_publish',
      'pages_read_engagement',
      'pages_show_list',
    ],
  },
  tiktok: {
    authorizationEndpoint: 'https://www.tiktok.com/v2/auth/authorize',
    tokenEndpoint: 'https://open.tiktokapis.com/v2/oauth/token/',
    revocationEndpoint: 'https://open.tiktokapis.com/v2/oauth/revoke/',
    scopes: [
      'user.info.basic',
      'video.list',
      'video.upload',
      'video.publish',
    ],
  },
  youtube: {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    scopes: [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ],
  },
  linkedin_pages: {
    authorizationEndpoint: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenEndpoint: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: [
      'r_liteprofile',
      'r_emailaddress',
      'w_member_social',
      'rw_organization_admin',
    ],
  },
  pinterest: {
    authorizationEndpoint: 'https://www.pinterest.com/oauth/',
    tokenEndpoint: 'https://api.pinterest.com/v5/oauth/token',
    scopes: [
      'boards:read',
      'pins:read',
      'pins:write',
      'user_accounts:read',
    ],
  },
};

/**
 * Get OAuth endpoints for a specific platform
 */
export function getOAuthEndpoints(platform: Platform): PlatformOAuthEndpoints | null {
  return platformOAuthEndpoints[platform] || null;
}

/**
 * Get redirect URI for OAuth callback
 * In production, this should match the registered redirect URI in the OAuth app
 */
export function getRedirectUri(): string {
  // For local development
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    return `${origin}/api/oauth/callback`;
  }
  return 'http://localhost:3000/api/oauth/callback';
}
