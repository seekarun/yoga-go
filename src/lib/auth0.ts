/**
 * Auth0 Client Configuration
 * This creates the Auth0 client instance used throughout the application
 *
 * Note: User database sync happens in /api/auth/me route, not in middleware,
 * because middleware runs in Edge Runtime which doesn't support Mongoose.
 */
import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_ISSUER_BASE_URL!.replace('https://', ''),
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  appBaseUrl: process.env.AUTH0_BASE_URL!,
  secret: process.env.AUTH0_SECRET!,
  signInReturnToPath: '/app',
});
