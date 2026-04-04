# OAuth 2.0 with PKCE Flow Diagram

## Complete Authentication Flow

```
┌─────────────┐                                      ┌──────────────────┐
│   Browser   │                                      │  Social Platform │
│   (User)    │                                      │   (Twitter/FB)   │
└──────┬──────┘                                      └────────┬─────────┘
       │                                                      │
       │ 1. Click "Connect Twitter"                          │
       │                                                      │
       ▼                                                      │
┌─────────────────────────────────────────┐                  │
│  Platform Adapter                       │                  │
│  (TwitterAdapter.startOAuthFlow())      │                  │
└──────┬──────────────────────────────────┘                  │
       │                                                      │
       │ 2. Generate PKCE parameters                         │
       │    - code_verifier (random 32 bytes)                │
       │    - code_challenge = SHA256(verifier)              │
       │    - state (random CSRF token)                      │
       │                                                      │
       ▼                                                      │
┌─────────────────────────────────────────┐                  │
│  OAuth Service                          │                  │
│  (oauthService.startAuthorizationFlow()) │                  │
│                                         │                  │
│  Store: { state, verifier, challenge }  │                  │
└──────┬──────────────────────────────────┘                  │
       │                                                      │
       │ 3. Build authorization URL with:                    │
       │    - client_id                                      │
       │    - redirect_uri                                   │
       │    - state                                          │
       │    - code_challenge                                 │
       │    - code_challenge_method=S256                     │
       │    - scope                                          │
       │                                                      │
       │ 4. Redirect user to authorization URL               │
       ├─────────────────────────────────────────────────────>│
       │                                                      │
       │                                                      │ 5. User authorizes app
       │                                                      │    (login & grant permissions)
       │                                                      │
       │ 6. Redirect back with code & state                  │
       │<─────────────────────────────────────────────────────┤
       │    /api/oauth/callback?code=...&state=...           │
       │                                                      │
       ▼                                                      │
┌─────────────────────────────────────────┐                  │
│  Platform Adapter                       │                  │
│  (TwitterAdapter.completeOAuthFlow())   │                  │
└──────┬──────────────────────────────────┘                  │
       │                                                      │
       │ 7. Validate state (CSRF protection)                 │
       │                                                      │
       ▼                                                      │
┌─────────────────────────────────────────┐                  │
│  OAuth Service                          │                  │
│  (oauthService.exchangeCodeForToken())  │                  │
└──────┬──────────────────────────────────┘                  │
       │                                                      │
       │ 8. Exchange code for tokens:                        │
       │    POST to token endpoint with:                     │
       │    - code                                           │
       │    - code_verifier (proves we started the flow)     │
       │    - client_id                                      │
       │    - redirect_uri                                   │
       ├─────────────────────────────────────────────────────>│
       │                                                      │
       │                                                      │ 9. Verify code_verifier
       │                                                      │    matches code_challenge
       │                                                      │
       │ 10. Receive tokens                                  │
       │<─────────────────────────────────────────────────────┤
       │     {                                               │
       │       access_token,                                 │
       │       refresh_token,                                │
       │       expires_in,                                   │
       │       scope                                         │
       │     }                                               │
       │                                                      │
       ▼                                                      │
┌─────────────────────────────────────────┐                  │
│  Store tokens securely                  │                  │
│  - access_token                         │                  │
│  - refresh_token                        │                  │
│  - expires_at (calculated)              │                  │
└─────────────────────────────────────────┘                  │
                                                              │
       ┌──────────────────────────────────┐                  │
       │  Authenticated! Ready to use API │                  │
       └──────────────────────────────────┘                  │
```

## Token Refresh Flow

```
┌─────────────┐                                      ┌──────────────────┐
│   Adapter   │                                      │  Social Platform │
└──────┬──────┘                                      └────────┬─────────┘
       │                                                      │
       │ 1. API call needed                                  │
       │                                                      │
       ▼                                                      │
┌─────────────────────────────────────────┐                  │
│  OAuth Integration                      │                  │
│  (getAccessToken())                     │                  │
│                                         │                  │
│  Check: is token expired?               │                  │
│  (current time + 5min buffer)           │                  │
└──────┬──────────────────────────────────┘                  │
       │                                                      │
       │ If expired:                                         │
       │                                                      │
       ▼                                                      │
┌─────────────────────────────────────────┐                  │
│  OAuth Service                          │                  │
│  (refreshAccessToken())                 │                  │
│                                         │                  │
│  POST to token endpoint with:           │                  │
│  - grant_type=refresh_token             │                  │
│  - refresh_token                        │                  │
│  - client_id                            │                  │
       ├─────────────────────────────────────────────────────>│
       │                                                      │
       │ Receive new tokens                                  │
       │<─────────────────────────────────────────────────────┤
       │     {                                               │
       │       access_token (new),                           │
       │       refresh_token (new or same),                  │
       │       expires_in                                    │
       │     }                                               │
       │                                                      │
       ▼                                                      │
┌─────────────────────────────────────────┐                  │
│  Update stored tokens                   │                  │
└─────────────────────────────────────────┘                  │
       │                                                      │
       │ 2. Use fresh access_token for API call             │
       ├─────────────────────────────────────────────────────>│
       │     Authorization: Bearer {access_token}            │
       │                                                      │
       │ 3. Success!                                         │
       │<─────────────────────────────────────────────────────┤
       │                                                      │
```

## Security Benefits of PKCE

### Without PKCE (Vulnerable)
```
Attacker intercepts authorization code
    ↓
Attacker exchanges code for tokens
    ↓
Attacker gains access to user account ❌
```

### With PKCE (Protected)
```
Attacker intercepts authorization code
    ↓
Attacker tries to exchange code
    ↓
Platform requests code_verifier
    ↓
Attacker doesn't have verifier (only saw challenge)
    ↓
Exchange fails ✅
```

## Key Security Features

1. **Code Verifier**: Random secret generated by client, never transmitted
2. **Code Challenge**: SHA-256 hash of verifier, sent to authorization server
3. **State Parameter**: Random token to prevent CSRF attacks
4. **HTTPS Only**: All communication encrypted
5. **Short-lived Tokens**: Access tokens expire, requiring refresh
6. **Token Storage**: Securely stored, never logged

## Platform-Specific Notes

### Twitter/X
- Supports PKCE natively
- Refresh tokens available with `offline.access` scope
- Tokens typically valid for 2 hours

### Facebook/Instagram
- PKCE optional but recommended
- Long-lived tokens available (60 days)
- Can exchange for long-lived tokens after initial auth

### TikTok
- Supports PKCE
- Refresh tokens available
- Strict redirect URI matching

### YouTube (Google)
- Full PKCE support
- Refresh tokens available with `access_type=offline`
- Tokens valid for 1 hour
