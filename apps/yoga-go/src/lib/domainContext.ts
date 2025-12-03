/**
 * Domain Context Utilities
 *
 * Helper functions to detect expert mode and domain context
 * Works in both server and client environments
 */

import { getExpertIdFromHostname, isPrimaryDomain, getExpertConfig } from '@/config/domains';
import type { ExpertDomainConfig } from '@/config/domains';

/**
 * Get expert context from Next.js request headers (Server Component)
 * Use this in Server Components and Server Actions
 *
 * NOTE: This function must be imported and called ONLY in Server Components
 * because it uses 'next/headers' which is not available in Client Components
 */
export async function getExpertContext(): Promise<{
  isExpertMode: boolean;
  expertId: string | null;
  expertConfig: ExpertDomainConfig | null;
}> {
  // Dynamic import to avoid bundling 'next/headers' in client components
  const { headers } = await import('next/headers');
  const headersList = await headers();
  const host = headersList.get('host') || '';

  const expertId = getExpertIdFromHostname(host);
  const isExpertMode = expertId !== null;
  const expertConfig = expertId ? getExpertConfig(expertId) : null;

  return {
    isExpertMode,
    expertId,
    expertConfig,
  };
}

/**
 * Get expert context from window.location (Client Component)
 * Use this in Client Components
 */
export function getClientExpertContext(): {
  isExpertMode: boolean;
  expertId: string | null;
  expertConfig: ExpertDomainConfig | null;
} {
  if (typeof window === 'undefined') {
    return {
      isExpertMode: false,
      expertId: null,
      expertConfig: null,
    };
  }

  const host = window.location.host;
  const expertId = getExpertIdFromHostname(host);
  const isExpertMode = expertId !== null;
  const expertConfig = expertId ? getExpertConfig(expertId) : null;

  return {
    isExpertMode,
    expertId,
    expertConfig,
  };
}

/**
 * Check if current request is on expert domain (Server)
 */
export async function isExpertDomain(): Promise<boolean> {
  const { isExpertMode } = await getExpertContext();
  return isExpertMode;
}

/**
 * Check if current page is on expert domain (Client)
 */
export function isClientExpertDomain(): boolean {
  const { isExpertMode } = getClientExpertContext();
  return isExpertMode;
}

/**
 * Get expert ID from hostname string (utility)
 */
export function getExpertFromHost(host: string): string | null {
  return getExpertIdFromHostname(host);
}

/**
 * Check if hostname is primary domain (utility)
 */
export function isHostPrimaryDomain(host: string): boolean {
  return isPrimaryDomain(host);
}
