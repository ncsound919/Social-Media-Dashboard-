import { AutheliaUser, mapRoleFromGroups } from './authelia';

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  groups: string[];
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number;
  platformTokens: Record<string, PlatformToken>;
}

export interface PlatformToken {
  platform: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scopes: string[];
}

export function buildSessionUser(
  autheliaUser: AutheliaUser,
  accessToken: string,
  refreshToken: string,
  tokenExpiresIn: number
): SessionUser {
  return {
    id: autheliaUser.sub,
    name: autheliaUser.name,
    email: autheliaUser.email,
    username: autheliaUser.preferred_username,
    role: mapRoleFromGroups(autheliaUser.groups),
    groups: autheliaUser.groups,
    accessToken,
    refreshToken,
    tokenExpiresAt: Date.now() + tokenExpiresIn * 1000,
    platformTokens: {},
  };
}

export function isTokenExpired(session: SessionUser): boolean {
  return Date.now() >= session.tokenExpiresAt - 60_000;
}

export function canPublish(session: SessionUser): boolean {
  return session.role === 'admin' || session.role === 'editor';
}

export function canManageTeam(session: SessionUser): boolean {
  return session.role === 'admin';
}

export function canViewAnalytics(session: SessionUser): boolean {
  return true; // all roles can view
}

export function addPlatformToken(session: SessionUser, token: PlatformToken): SessionUser {
  return {
    ...session,
    platformTokens: {
      ...session.platformTokens,
      [token.platform]: token,
    },
  };
}

export function getPlatformToken(session: SessionUser, platform: string): PlatformToken | null {
  return session.platformTokens[platform] ?? null;
}

export function isPlatformConnected(session: SessionUser, platform: string): boolean {
  const token = getPlatformToken(session, platform);
  if (!token) return false;
  return Date.now() < token.expiresAt - 60_000;
}

export function getConnectedPlatforms(session: SessionUser): string[] {
  return Object.keys(session.platformTokens).filter((p) => isPlatformConnected(session, p));
}
