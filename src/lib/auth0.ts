/**
 * Auth0 Client Configuration
 * This creates the Auth0 client instance used throughout the application
 *
 * Note: With v4, Auth0 routes are automatically mounted by middleware.
 * User database sync happens on first access to /api/auth/me route.
 */
import { Auth0Client } from '@auth0/nextjs-auth0/server';

// Safe domain extraction - handles undefined during build time
const getDomain = () => {
  const issuerUrl = process.env.AUTH0_ISSUER_BASE_URL || 'https://placeholder.auth0.com';
  return issuerUrl.replace('https://', '');
};

export const auth0 = new Auth0Client({
  domain: getDomain(),
  clientId: process.env.AUTH0_CLIENT_ID || 'placeholder',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || 'placeholder',
  appBaseUrl: process.env.AUTH0_BASE_URL || 'http://localhost:3111',
  secret: process.env.AUTH0_SECRET || 'placeholder-secret-at-least-32-characters-long',
  routes: {
    callback: '/auth/callback',
    login: '/auth/login',
    logout: '/auth/logout',
  },
});
