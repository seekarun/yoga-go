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
 */
export function isPrimaryDomain(hostname: string): boolean {
  const cleanHostname = hostname.toLowerCase();
  return PRIMARY_DOMAINS.some(domain => cleanHostname.includes(domain));
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
 * 3. Check myyoga.guru subdomains (validated against DB)
 * 4. Try dynamic lookup from DynamoDB for custom domains
 *
 * Note: This function is async because of DynamoDB lookup.
 * For middleware use, import from tenantRepository.
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

  // Import here to avoid circular dependency
  const { getTenantByDomain } = await import('@/lib/repositories/tenantRepository');

  // 3. Check myyoga.guru subdomains - validate against database
  const subdomain = getSubdomainFromMyYogaGuru(hostname);
  if (subdomain) {
    // Look up the subdomain in the database to validate it exists
    const fullDomain = `${subdomain}.myyoga.guru`;
    const tenant = await getTenantByDomain(fullDomain);

    if (tenant) {
      console.log('[DBG][domains] Found tenant for subdomain:', subdomain);
      return {
        tenantId: tenant.id,
        expertId: tenant.expertId,
      };
    }

    // Subdomain doesn't have a tenant - return null to trigger 404/redirect
    console.log('[DBG][domains] No tenant found for subdomain:', subdomain);
    return null;
  }

  // 4. Dynamic lookup from DynamoDB for custom domains
  const tenant = await getTenantByDomain(hostname);

  if (tenant) {
    return {
      tenantId: tenant.id,
      expertId: tenant.expertId,
    };
  }

  return null;
}
