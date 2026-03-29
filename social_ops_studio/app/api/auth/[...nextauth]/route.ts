import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import { getAutheliaClient, exchangeCodeForTokens, getUserInfo, mapRoleFromGroups } from '@/core/auth/authelia';
import { buildSessionUser } from '@/core/auth/session';

export const authConfig: NextAuthConfig = {
  providers: [
    {
      id: 'authelia',
      name: 'Authelia',
      type: 'oidc',
      issuer: process.env.AUTHELIA_URL,
      clientId: process.env.AUTHELIA_CLIENT_ID,
      clientSecret: process.env.AUTHELIA_CLIENT_SECRET_DASHBOARD,
      authorization: {
        params: {
          scope: 'openid profile email groups',
          response_type: 'code',
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          role: mapRoleFromGroups(profile.groups ?? []),
          groups: profile.groups ?? [],
          username: profile.preferred_username,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.role = mapRoleFromGroups((profile as any).groups ?? []);
        token.groups = (profile as any).groups ?? [];
        token.username = (profile as any).preferred_username;
        token.platformTokens = {};
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session as any).user.role = token.role;
        (session as any).user.groups = token.groups;
        (session as any).user.username = token.username;
        (session as any).accessToken = token.accessToken;
        (session as any).platformTokens = token.platformTokens ?? {};
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 3600,
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authConfig);
export { handler as GET, handler as POST };
