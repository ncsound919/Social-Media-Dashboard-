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
        // Persist Authelia claims in the JWT on first sign-in
        token.autheliaGroups = (profile as Record<string, unknown>).groups ?? [];
        token.autheliaProfile = profile;
      }
      return token;
    },
    async session({ session, token }) {
      // Map JWT claims to the application session user
      const claims = {
        sub: token.sub,
        email: token.email,
        name: token.name,
        preferred_username: token.preferred_username,
        groups: token.autheliaGroups,
        ...(token.autheliaProfile as Record<string, unknown>),
      };
      const sessionUser = buildSessionUser(claims as Record<string, unknown>);
      (session as Record<string, unknown>).user = sessionUser;
      return session;
    },
  },
};

const { handlers, auth, signIn, signOut } = NextAuth(config);

const { GET, POST } = handlers;
export { GET, POST, auth, signIn, signOut };
