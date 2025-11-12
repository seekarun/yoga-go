/**
 * Subdomain Redirect Utilities
 *
 * Helper functions for role-based subdomain redirects after Auth0 login.
 * Handles redirecting experts to admin subdomain and learners to main domain.
 */

import type { UserRole } from '@/types';
import { isAdminDomain } from '@/config/domains';

/**
 * Get the correct base domain for a user role
 * @param role - User role ('learner' or 'expert')
 * @param env - Environment ('development' or 'production')
 * @returns Full domain URL (e.g., 'http://admin.localhost:3111' or 'https://myyoga.guru')
 */
export function getCorrectDomainForRole(role: UserRole, env: string = 'development'): string {
  const isProduction = env === 'production';

  if (role === 'expert') {
    // Expert → admin subdomain
    return isProduction ? 'https://admin.myyoga.guru' : 'http://admin.localhost:3111';
  }

  // Learner → main domain
  return isProduction ? 'https://myyoga.guru' : 'http://localhost:3111';
}

/**
 * Get the full target URL for a user role (including path)
 * @param role - User role ('learner' or 'expert')
 * @param env - Environment ('development' or 'production')
 * @returns Full redirect URL with path
 *
 * Important:
 * - Expert: Returns ROOT path (/) because middleware rewrites to /srv
 * - Learner: Returns /app path explicitly
 */
export function getTargetUrlForRole(role: UserRole, env: string = 'development'): string {
  const baseDomain = getCorrectDomainForRole(role, env);

  if (role === 'expert') {
    // Expert → admin subdomain ROOT
    // Middleware automatically rewrites / to /srv
    // This keeps URL clean: admin.myyoga.guru/ instead of admin.myyoga.guru/srv
    return `${baseDomain}/`;
  }

  // Learner → main domain with explicit /app path
  // No middleware rewriting on main domain, so we need the full path
  return `${baseDomain}/app`;
}

/**
 * Check if user should be redirected based on their role and current subdomain
 * @param role - User role ('learner' or 'expert')
 * @param currentHostname - Current hostname from request (e.g., 'localhost:3111' or 'admin.myyoga.guru')
 * @returns true if user is on wrong subdomain and needs redirect
 */
export function shouldRedirectBasedOnRole(role: UserRole, currentHostname: string): boolean {
  const isOnAdminDomain = isAdminDomain(currentHostname);

  // Expert should be on admin domain
  if (role === 'expert' && !isOnAdminDomain) {
    return true; // Expert on main domain → needs redirect to admin
  }

  // Learner should NOT be on admin domain
  if (role === 'learner' && isOnAdminDomain) {
    return true; // Learner on admin domain → needs redirect to main
  }

  // User is on correct subdomain
  return false;
}
