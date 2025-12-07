/**
 * Domain Configuration
 *
 * Centralized mapping of custom domains to expert IDs.
 * Used by middleware and components to determine expert-specific behavior.
 */

export interface ExpertDomainConfig {
  expertId: string;
  domains: string[];
  name: string;
  title: string;
}

/**
 * Map of expert domains to expert configuration
 */
export const EXPERT_DOMAINS: Record<string, ExpertDomainConfig> = {
  kavitha: {
    expertId: 'kavitha',
    domains: ['kavithayoga.com', 'www.kavithayoga.com', 'kavithayoga.local'],
    name: 'Kavitha',
    title: 'Vinyasa Flow & Therapeutic Yoga Expert',
  },
  deepak: {
    expertId: 'deepak',
    domains: ['deepakyoga.com', 'www.deepakyoga.com', 'deepakyoga.local'],
    name: 'Deepak',
    title: 'Yoga Master & Wellness Coach',
  },
  tester: {
    expertId: 'tester',
    domains: ['tester.myyoga.guru', 'www.tester.myyoga.guru', 'tester.local'],
    name: 'Tester',
    title: 'Test Expert',
  },
};

/**
 * Admin subdomain - redirects to expert portal (/srv)
 */
export const ADMIN_DOMAINS = [
  'admin.myyoga.guru',
  'www.admin.myyoga.guru',
  'admin.local',
  'admin.localhost', // Local development subdomain
];

/**
 * Primary app domains (non-expert domains that show full platform)
 */
export const PRIMARY_DOMAINS = [
  'yogago.com',
  'www.yogago.com',
  'myyoga.guru',
  'www.myyoga.guru',
  'localhost',
  'localhost:3111',
  'admin.localhost:3111', // Admin subdomain for local development
  '127.0.0.1',
  '127.0.0.1:3111',
];

/**
 * Get expert ID from hostname
 * Returns expert ID if hostname matches an expert domain, null otherwise
 */
export function getExpertIdFromHostname(hostname: string): string | null {
  // Remove port if present
  const cleanHostname = hostname.split(':')[0].toLowerCase();

  // Check each expert domain
  for (const [expertId, config] of Object.entries(EXPERT_DOMAINS)) {
    if (config.domains.includes(cleanHostname)) {
      return expertId;
    }
  }

  return null;
}

/**
 * Check if hostname is an admin domain
 */
export function isAdminDomain(hostname: string): boolean {
  const cleanHostname = hostname.split(':')[0].toLowerCase();
  return ADMIN_DOMAINS.includes(cleanHostname);
}

/**
 * Check if hostname is a primary domain (not expert-specific)
 * Uses exact match (with optional port) to avoid matching subdomains
 */
export function isPrimaryDomain(hostname: string): boolean {
  // Remove port if present for comparison
  const cleanHostname = hostname.toLowerCase().split(':')[0];

  // Check exact match against primary domains (also removing ports from them)
  return PRIMARY_DOMAINS.some(domain => {
    const cleanDomain = domain.split(':')[0];
    return cleanHostname === cleanDomain;
  });
}

/**
 * Extract subdomain from myyoga.guru hostname
 * Returns subdomain if it's a valid expert subdomain, null otherwise
 *
 * Examples:
 * - deepak.myyoga.guru -> 'deepak'
 * - www.myyoga.guru -> null (www is excluded)
 * - admin.myyoga.guru -> null (admin is excluded)
 * - myyoga.guru -> null (no subdomain)
 */
export function getSubdomainFromMyYogaGuru(hostname: string): string | null {
  const cleanHostname = hostname.split(':')[0].toLowerCase();

  // Check if it's a myyoga.guru domain
  if (!cleanHostname.endsWith('.myyoga.guru')) {
    return null;
  }

  // Extract subdomain part (everything before .myyoga.guru)
  const subdomain = cleanHostname.replace('.myyoga.guru', '');

  // Exclude www and admin subdomains
  if (subdomain === 'www' || subdomain === 'admin' || !subdomain) {
    return null;
  }

  return subdomain;
}

/**
 * Get expert configuration by ID
 */
export function getExpertConfig(expertId: string): ExpertDomainConfig | null {
  return EXPERT_DOMAINS[expertId] || null;
}

/**
 * Get all expert IDs
 */
export function getAllExpertIds(): string[] {
  return Object.keys(EXPERT_DOMAINS);
}

/**
 * Resolve domain to tenant (dynamic multi-tenancy)
 *
 * Resolution order:
 * 1. Check if it's a primary domain -> return null
 * 2. Check static EXPERT_DOMAINS config (backwards compat)
 * 3. Check myyoga.guru subdomains (validated via API)
 * 4. Try dynamic lookup via internal API for custom domains
 *
 * Note: This function uses an internal API route for DynamoDB lookups
 * because Edge Middleware cannot reliably use the AWS SDK directly.
 */
export async function resolveDomainToTenant(
  hostname: string
): Promise<{ tenantId: string; expertId: string } | null> {
  // 1. Primary domains don't have tenants
  if (isPrimaryDomain(hostname)) {
    return null;
  }

  // 2. Check static config first (backwards compatibility)
  const staticExpertId = getExpertIdFromHostname(hostname);
  if (staticExpertId) {
    return {
      tenantId: staticExpertId,
      expertId: staticExpertId,
    };
  }

  // 3. Check myyoga.guru subdomains
  const subdomain = getSubdomainFromMyYogaGuru(hostname);

  // Use internal API route for domain lookup (works in Edge Runtime)
  try {
    // Determine the base URL for the API call
    // In Edge Middleware, we need to construct the full URL
    const protocol = hostname.includes('localhost') ? 'http' : 'https';
    // Use myyoga.guru as the API host since custom domains point to the same deployment
    const apiHost = hostname.includes('localhost') ? hostname : 'myyoga.guru';
    const lookupDomain = subdomain ? `${subdomain}.myyoga.guru` : hostname;

    const apiUrl = `${protocol}://${apiHost}/api/internal/resolve-domain?domain=${encodeURIComponent(lookupDomain)}`;

    console.log('[DBG][domains] Calling resolve-domain API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Don't follow redirects, and set a timeout
      redirect: 'manual',
    });

    if (!response.ok) {
      console.error('[DBG][domains] API call failed:', response.status);
      // Fall through to subdomain handling
    } else {
      const data = await response.json();

      if (data.tenantId && data.expertId) {
        console.log(
          '[DBG][domains] Found tenant via API:',
          data.tenantId,
          'expert:',
          data.expertId
        );
        return {
          tenantId: data.tenantId,
          expertId: data.expertId,
        };
      }

      // No tenant found
      if (subdomain) {
        console.log('[DBG][domains] No tenant found for subdomain:', subdomain);
        return null;
      }
    }
  } catch (error) {
    // API call failed - fall back gracefully
    console.error('[DBG][domains] Domain resolution API failed:', error);

    // For myyoga.guru subdomains without API access, allow the request
    // through - the page/API will handle the 404 if tenant doesn't exist
    if (subdomain) {
      console.log('[DBG][domains] Allowing subdomain through without API validation:', subdomain);
      return {
        tenantId: subdomain,
        expertId: subdomain,
      };
    }
  }

  return null;
}
