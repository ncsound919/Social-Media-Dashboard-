# OAuth 2.0 Setup Guide

This guide explains how to configure OAuth 2.0 authentication with PKCE support for social media platforms in the Social Ops Studio.

## Overview

The Social Ops Studio uses **OAuth 2.0 with PKCE (Proof Key for Code Exchange)** to securely authenticate with social media platforms. PKCE is a security extension to OAuth 2.0 that protects against authorization code interception attacks, making it suitable for both server-side and client-side applications.

## Supported Platforms

The following platforms support OAuth 2.0 with PKCE:

- **Twitter/X** - OAuth 2.0 with PKCE
- **Facebook Pages** - OAuth 2.0
- **Instagram Business** - OAuth 2.0 (via Meta/Facebook)
- **TikTok** - OAuth 2.0 with PKCE
- **YouTube** - OAuth 2.0 (via Google)
- **LinkedIn Pages** - OAuth 2.0
- **Pinterest** - OAuth 2.0

## Configuration Steps

### 1. Register Your Application

For each platform you want to integrate, you need to register your application and obtain OAuth credentials.

#### Twitter/X
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project and app
3. Navigate to "User authentication settings"
4. Set the following:
   - **App permissions**: Read and Write
   - **Type of App**: Web App
   - **Callback URI**: `http://localhost:3000/api/oauth/callback` (for development)
   - **Website URL**: Your website URL
5. Copy the **Client ID** and **Client Secret**

#### Facebook Pages
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app with type "Business"
3. Add "Facebook Login" product
4. Configure OAuth Redirect URIs:
   - Add `http://localhost:3000/api/oauth/callback` for development
5. In App Review, request the following permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_read_user_content`
6. Copy the **App ID** (Client ID) and **App Secret** (Client Secret)

#### Instagram Business
1. Use the same Meta app as Facebook Pages
2. Instagram Business accounts require a Facebook Page connection
3. Ensure you have the following permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
   - `pages_show_list`

#### TikTok
1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Create a new app
3. Add "Login Kit" capability
4. Configure Redirect URI: `http://localhost:3000/api/oauth/callback`
5. Request the following scopes:
   - `user.info.basic`
   - `video.list`
   - `video.upload`
   - `video.publish`
6. Copy the **Client Key** (Client ID) and **Client Secret**

#### YouTube (Google)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/oauth/callback`
5. Copy the **Client ID** and **Client Secret**

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env.local`:

```bash
cp social_ops_studio/.env.example social_ops_studio/.env.local
```

Edit `.env.local` and add your OAuth credentials:

```env
# Twitter/X OAuth 2.0
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# Facebook Pages OAuth 2.0
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret

# Instagram Business (Meta)
INSTAGRAM_CLIENT_ID=your_facebook_app_id
INSTAGRAM_CLIENT_SECRET=your_facebook_app_secret

# TikTok
TIKTOK_CLIENT_ID=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret

# YouTube (Google)
YOUTUBE_CLIENT_ID=your_google_client_id
YOUTUBE_CLIENT_SECRET=your_google_client_secret
```

### 3. Update Redirect URIs for Production

When deploying to production, update the redirect URIs in each platform's developer settings to match your production domain:

```
https://yourdomain.com/api/oauth/callback
```

## How OAuth 2.0 with PKCE Works

### Flow Overview

1. **User initiates authentication**: Click "Connect" button for a platform
2. **Generate PKCE parameters**:
   - Create random `code_verifier` (43-128 characters)
   - Generate `code_challenge` from verifier using SHA-256
   - Create random `state` for CSRF protection
3. **Redirect to authorization endpoint**: User authorizes the app
4. **Receive authorization code**: Platform redirects back with code and state
5. **Exchange code for tokens**: Send code and verifier to token endpoint
6. **Store tokens securely**: Save access token and refresh token
7. **Use access token**: Make API calls with the access token
8. **Refresh when needed**: Use refresh token to get new access token when expired

### Security Features

- **PKCE**: Protects against authorization code interception
- **State parameter**: Prevents CSRF attacks
- **Token storage**: Tokens are stored in browser storage (note: for production, consider using httpOnly cookies or server-side storage for enhanced security against XSS attacks)
- **Automatic token refresh**: Handles token expiration transparently
- **Token revocation**: Properly revoke tokens on disconnect

## Usage in Code

### Starting OAuth Flow

```typescript
import { getAdapter } from '@/integrations';

const adapter = getAdapter('twitter_x');
if (adapter) {
  // Start OAuth flow - returns authorization URL
  const authUrl = await adapter.startOAuthFlow();
  if (authUrl) {
    window.location.href = authUrl;
  }
}
```

### Handling OAuth Callback

```typescript
// In your callback endpoint (/api/oauth/callback)
const code = searchParams.get('code');
const state = searchParams.get('state');

if (code && state) {
  const adapter = getAdapter('twitter_x');
  const success = await adapter.completeOAuthFlow(code, state);
  
  if (success) {
    // Redirect to dashboard or show success message
  }
}
```

### Checking Authentication Status

```typescript
const adapter = getAdapter('twitter_x');
const isConnected = await adapter.validateConnection();
```

## Scopes and Permissions

Each platform requires specific scopes/permissions to function:

### Twitter/X
- `tweet.read` - Read tweets
- `tweet.write` - Create, delete tweets
- `users.read` - Read user profile
- `offline.access` - Get refresh token

### Facebook Pages
- `pages_show_list` - List pages
- `pages_read_engagement` - Read engagement metrics
- `pages_manage_posts` - Create and manage posts
- `pages_read_user_content` - Read page content
- `public_profile` - Read public profile

### Instagram Business
- `instagram_basic` - Basic Instagram data
- `instagram_content_publish` - Publish content
- `pages_read_engagement` - Read engagement
- `pages_show_list` - List connected pages

### TikTok
- `user.info.basic` - Basic user info
- `video.list` - List videos
- `video.upload` - Upload videos
- `video.publish` - Publish videos

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**
   - Ensure the redirect URI in your OAuth app matches exactly
   - Include the protocol (http:// or https://)
   - Check for trailing slashes

2. **"Invalid client" error**
   - Verify your Client ID and Client Secret are correct
   - Check that the credentials are for the correct environment (dev/prod)

3. **"Invalid state parameter"**
   - Clear browser cache and cookies
   - This may indicate a CSRF attack attempt

4. **Token refresh fails**
   - Some platforms don't provide refresh tokens by default
   - Ensure you requested `offline.access` or equivalent scope
   - Re-authenticate if refresh token is missing

5. **Scopes not granted**
   - User must approve all requested scopes
   - Some scopes require app review before use
   - Check platform-specific permission requirements

## Best Practices

1. **Never commit credentials**: Keep `.env.local` out of version control
2. **Use environment-specific credentials**: Separate dev and prod credentials
3. **Implement proper error handling**: Handle OAuth errors gracefully
4. **Store tokens securely**: Never log or expose tokens
5. **Respect rate limits**: Implement backoff strategies
6. **Handle token expiration**: Always check token validity before use
7. **Test with multiple accounts**: Verify OAuth works for different users
8. **Monitor OAuth metrics**: Track authentication success/failure rates

## References

- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [Twitter OAuth 2.0](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- [Meta OAuth](https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow)
- [TikTok Login Kit](https://developers.tiktok.com/doc/login-kit-web)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
