/**
 * NextAuth v5 Configuration with AWS Cognito
 * This replaces the Auth0 SDK with NextAuth using Cognito as the provider
 */
import NextAuth from 'next-auth';
import Cognito from 'next-auth/providers/cognito';
import type { NextAuthConfig } from 'next-auth';

// Extend the session and JWT types to include cognitoSub
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      cognitoSub?: string;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    cognitoSub?: string;
  }
}

const config: NextAuthConfig = {
  providers: [
    Cognito({
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      issuer: process.env.COGNITO_ISSUER!,
      authorization: {
        params: {
          // Force account selection on every login
          prompt: 'login',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Store Cognito sub as the identifier on first sign in
      if (account && profile) {
        token.cognitoSub = profile.sub as string;
      }
      // Fallback: if cognitoSub is missing but sub exists, use sub
      // This handles existing sessions that were created before cognitoSub was added
      if (!token.cognitoSub && token.sub) {
        token.cognitoSub = token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      // Add Cognito sub to session for user lookup
      if (token.cognitoSub) {
        session.user.cognitoSub = token.cognitoSub;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);
