/**
 * NextAuth.js v5 route handler using Authelia as the OIDC provider.
 * Configured with JWT session strategy.
 */

import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import { buildSessionUser } from '@/core/auth/session';

const autheliaBaseUrl = (process.env.AUTHELIA_URL ?? '').replace(/\/$/, '');

const config: NextAuthConfig = {
  providers: [
    {
      id: 'authelia',
      name: 'Authelia',
      type: 'oidc',
      issuer: autheliaBaseUrl,
      clientId: process.env.AUTHELIA_CLIENT_ID,
      clientSecret: process.env.AUTHELIA_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid profile email groups',
        },
      },
    },
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const p = profile as Record<string, unknown>;
        // Store only the specific claims we need — avoid exceeding cookie size limits
        token.autheliaGroups = Array.isArray(p.groups) && p.groups.every(g => typeof g === 'string')
          ? p.groups
          : [];
        token.autheliaPreferredUsername = typeof p.preferred_username === 'string'
          ? p.preferred_username
          : undefined;
      }
      return token;
    },
    async session({ session, token }) {
      // Map JWT claims to the application session user
      const claims: Record<string, unknown> = {
        sub: token.sub,
        email: token.email,
        name: token.name,
        preferred_username: token.autheliaPreferredUsername,
        groups: token.autheliaGroups,
      };
      const sessionUser = buildSessionUser(claims);
      (session as Record<string, unknown>).user = sessionUser;
      return session;
    },
  },
};

const { handlers, auth, signIn, signOut } = NextAuth(config);

const { GET, POST } = handlers;
export { GET, POST, auth, signIn, signOut };
