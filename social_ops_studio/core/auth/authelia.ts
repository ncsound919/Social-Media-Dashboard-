import { Issuer, Client, generators, TokenSet } from 'openid-client';

const AUTHELIA_URL = process.env.AUTHELIA_URL || 'http://localhost:9091';
const CLIENT_ID = process.env.AUTHELIA_CLIENT_ID || 'social-ops-studio';
const CLIENT_SECRET = process.env.AUTHELIA_CLIENT_SECRET_DASHBOARD || '';
const REDIRECT_URI = `${process.env.APP_BASE_URL}/api/auth/callback/authelia`;

let _client: Client | null = null;

export async function getAutheliaClient(): Promise<Client> {
  if (_client) return _client;
  const issuer = await Issuer.discover(`${AUTHELIA_URL}`);
  _client = new issuer.Client({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uris: [REDIRECT_URI],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_post',
  });
  return _client;
}

export function generateAuthUrl(client: Client): { url: string; codeVerifier: string; state: string } {
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const state = generators.state();
  const url = client.authorizationUrl({
    scope: 'openid profile email groups',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });
  return { url, codeVerifier, state };
}

export async function exchangeCodeForTokens(
  client: Client,
  callbackParams: Record<string, string>,
  codeVerifier: string,
  expectedState: string
): Promise<TokenSet> {
  return client.callback(REDIRECT_URI, callbackParams, {
    code_verifier: codeVerifier,
    state: expectedState,
  });
}

export async function getUserInfo(client: Client, tokenSet: TokenSet) {
  return client.userinfo(tokenSet);
}

export async function refreshTokens(client: Client, refreshToken: string): Promise<TokenSet> {
  return client.refresh(refreshToken);
}

export async function revokeToken(client: Client, token: string): Promise<void> {
  await client.revoke(token);
}

export interface AutheliaUser {
  sub: string;
  name: string;
  email: string;
  groups: string[];
  preferred_username: string;
}

export function mapRoleFromGroups(groups: string[]): 'admin' | 'editor' | 'viewer' {
  if (groups.includes('admins')) return 'admin';
  if (groups.includes('editors')) return 'editor';
  return 'viewer';
}
