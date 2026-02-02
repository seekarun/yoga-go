/**
 * NextAuth v5 Configuration with AWS Cognito
 * Cally uses its own Cognito User Pool with Google OAuth
 */
import NextAuth from "next-auth";
import Cognito from "next-auth/providers/cognito";
import type { NextAuthConfig } from "next-auth";

// Extend the session and JWT types to include cognitoSub
declare module "next-auth" {
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

declare module "@auth/core/jwt" {
  interface JWT {
    cognitoSub?: string;
  }
}

// Build the Cognito issuer URL from User Pool ID
// Format: https://cognito-idp.{region}.amazonaws.com/{userPoolId}
const region = process.env.AWS_REGION || "ap-southeast-2";
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const cognitoIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

const config: NextAuthConfig = {
  providers: [
    Cognito({
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      issuer: cognitoIssuer,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Store Cognito sub as the identifier on first sign in
      if (account && profile) {
        token.cognitoSub = profile.sub as string;
      }
      // Fallback: if cognitoSub is missing but sub exists, use sub
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
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};

export const { handlers, signIn, signOut, auth } = NextAuth(config);
