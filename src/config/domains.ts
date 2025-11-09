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
 * Primary app domains (non-expert domains that show full platform)
 */
export const PRIMARY_DOMAINS = [
  'yogago.com',
  'www.yogago.com',
  'myyoga.guru',
  'www.myyoga.guru',
  'localhost',
  'localhost:3111',
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
 * Check if hostname is a primary domain (not expert-specific)
 */
export function isPrimaryDomain(hostname: string): boolean {
  const cleanHostname = hostname.toLowerCase();
  return PRIMARY_DOMAINS.some(domain => cleanHostname.includes(domain));
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
