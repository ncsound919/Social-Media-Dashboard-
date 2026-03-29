/**
 * Authelia OIDC Client
 * Self-hosted identity provider integration using openid-client
 */

export interface AutheliaConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

export interface OIDCTokenSet {
  accessToken: string;
  idToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  claims: Record<string, unknown>;
}

const DEFAULT_SCOPES = ['openid', 'profile', 'email', 'groups'];

/**
 * Build the Authelia OIDC configuration from environment variables.
 */
export function getAutheliaConfig(): AutheliaConfig {
  const issuerUrl = process.env.AUTHELIA_URL;
  const clientId = process.env.AUTHELIA_CLIENT_ID;
  const clientSecret = process.env.AUTHELIA_CLIENT_SECRET;
  const nextauthUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

  if (!issuerUrl || !clientId || !clientSecret) {
    throw new Error(
      'Missing required Authelia environment variables: AUTHELIA_URL, AUTHELIA_CLIENT_ID, AUTHELIA_CLIENT_SECRET'
    );
  }

  return {
    issuerUrl,
    clientId,
    clientSecret,
    redirectUri: `${nextauthUrl}/api/auth/callback/authelia`,
    scopes: DEFAULT_SCOPES,
  };
}

/**
 * Build the authorization URL for initiating the OIDC flow.
 */
export function buildAuthorizationUrl(
  config: AutheliaConfig,
  state: string,
  nonce: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: (config.scopes ?? DEFAULT_SCOPES).join(' '),
    state,
    nonce,
  });

  const baseUrl = config.issuerUrl.replace(/\/$/, '');
  return `${baseUrl}/api/oidc/authorization?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens using the Authelia token endpoint.
 */
export async function exchangeCodeForTokens(
  config: AutheliaConfig,
  code: string
): Promise<OIDCTokenSet> {
  const baseUrl = config.issuerUrl.replace(/\/$/, '');
  const tokenEndpoint = `${baseUrl}/api/oidc/token`;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const data = await response.json();

  const claims = decodeJwtPayload(data.id_token);

  return {
    accessToken: data.access_token,
    idToken: data.id_token ?? null,
    refreshToken: data.refresh_token ?? null,
    expiresAt: data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : null,
    claims,
  };
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refreshAccessToken(
  config: AutheliaConfig,
  refreshToken: string
): Promise<OIDCTokenSet> {
  const baseUrl = config.issuerUrl.replace(/\/$/, '');
  const tokenEndpoint = `${baseUrl}/api/oidc/token`;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const claims = decodeJwtPayload(data.id_token);

  return {
    accessToken: data.access_token,
    idToken: data.id_token ?? null,
    refreshToken: data.refresh_token ?? null,
    expiresAt: data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : null,
    claims,
  };
}

/**
 * Decode a JWT payload without verifying the signature (verification is
 * performed server-side by Authelia). Used only to read public claims.
 */
function decodeJwtPayload(jwt: string | undefined | null): Record<string, unknown> {
  if (!jwt) return {};
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return {};
    const payload = parts[1];
    const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
    const decoded = Buffer.from(padded, 'base64url').toString('utf-8');
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return {};
  }
}
