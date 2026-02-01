/**
 * Environment-based domain configuration
 *
 * This module centralizes all domain-related configuration to support
 * multiple domains (e.g., myyoga.guru, other-domain.com) without hardcoding.
 *
 * Set NEXT_PUBLIC_DOMAIN in your environment to change the base domain.
 */

// Base domain from environment (e.g., "myyoga.guru")
export const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'myyoga.guru';

// Protocol based on environment
export const PROTOCOL = process.env.NODE_ENV === 'production' ? 'https' : 'http';

// Local development port
export const LOCAL_PORT = process.env.PORT || '3111';

// Whether we're in production
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Base URL for the main domain
export const BASE_URL = IS_PRODUCTION ? `https://${DOMAIN}` : `http://localhost:${LOCAL_PORT}`;

// Cookie domain (with leading dot for subdomain support)
export const COOKIE_DOMAIN = IS_PRODUCTION ? `.${DOMAIN}` : undefined;

/**
 * Domain helper functions
 */

// Get subdomain URL (e.g., "deepak.myyoga.guru")
export const getSubdomainUrl = (subdomain: string): string => {
  if (IS_PRODUCTION) {
    return `https://${subdomain}.${DOMAIN}`;
  }
  return `http://${subdomain}.localhost:${LOCAL_PORT}`;
};

// Get subdomain host (e.g., "deepak.myyoga.guru")
export const getSubdomainHost = (subdomain: string): string => {
  return `${subdomain}.${DOMAIN}`;
};

// Get expert email (e.g., "deepak@myyoga.guru")
export const getExpertEmail = (expertId: string): string => {
  return `${expertId}@${DOMAIN}`;
};

// Platform email (e.g., "hi@myyoga.guru")
export const PLATFORM_EMAIL = `hi@${DOMAIN}`;

// Privacy email (e.g., "privacy@myyoga.guru")
export const PRIVACY_EMAIL = `privacy@${DOMAIN}`;

// Contact email (e.g., "contact@myyoga.guru")
export const CONTACT_EMAIL = `contact@${DOMAIN}`;

/**
 * Reserved/special subdomains
 */
export const RESERVED_SUBDOMAINS = ['www', 'admin', 'preview', 'learn', 'api', 'app'];

/**
 * Special domain URLs
 */
export const getAdminUrl = (): string => {
  if (IS_PRODUCTION) {
    return `https://admin.${DOMAIN}`;
  }
  return `http://admin.localhost:${LOCAL_PORT}`;
};

export const getPreviewUrl = (expertId?: string): string => {
  const base = IS_PRODUCTION
    ? `https://preview.${DOMAIN}`
    : `http://preview.localhost:${LOCAL_PORT}`;
  return expertId ? `${base}/${expertId}` : base;
};

export const getLearnUrl = (): string => {
  if (IS_PRODUCTION) {
    return `https://learn.${DOMAIN}`;
  }
  return `http://learn.localhost:${LOCAL_PORT}`;
};

/**
 * Domain pattern matchers
 */

// Check if hostname ends with our domain (e.g., "*.myyoga.guru")
export const isDomainSubdomain = (hostname: string): boolean => {
  const cleanHostname = hostname.toLowerCase().replace(/:\d+$/, '');
  return cleanHostname.endsWith(`.${DOMAIN}`);
};

// Check if hostname is the main domain (myyoga.guru or www.myyoga.guru)
export const isMainDomain = (hostname: string): boolean => {
  const cleanHostname = hostname.toLowerCase().replace(/:\d+$/, '');
  return cleanHostname === DOMAIN || cleanHostname === `www.${DOMAIN}`;
};

// Extract subdomain from hostname (returns null if not a subdomain)
export const extractSubdomain = (hostname: string): string | null => {
  const cleanHostname = hostname.toLowerCase().replace(/:\d+$/, '');

  if (!cleanHostname.endsWith(`.${DOMAIN}`)) {
    return null;
  }

  const subdomain = cleanHostname.replace(`.${DOMAIN}`, '');

  // Exclude reserved subdomains
  if (RESERVED_SUBDOMAINS.includes(subdomain) || !subdomain) {
    return null;
  }

  return subdomain;
};

/**
 * Brand name (for display purposes)
 */
export const BRAND_NAME = 'MyYoga.Guru';
export const BRAND_NAME_SHORT = 'MYG';
