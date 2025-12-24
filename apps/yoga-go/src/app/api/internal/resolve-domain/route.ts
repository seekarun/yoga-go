/**
 * Internal API route for domain resolution
 *
 * Called by Edge Middleware to resolve custom domains to tenants.
 * Runs in Node.js runtime so it can access DynamoDB reliably.
 *
 * Note: Expert and Tenant are now consolidated into a single TENANT entity.
 * The tenant.id serves as both tenantId and expertId.
 *
 * Returns:
 * - tenantId: The tenant ID (also the expert ID)
 * - expertId: Same as tenantId (for backward compatibility)
 * - isLandingPagePublished: Whether the landing page is published
 */

import { NextResponse } from 'next/server';
import { getTenantByDomain } from '@/lib/repositories/tenantRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');

  if (!domain) {
    return NextResponse.json({ error: 'Missing domain parameter' }, { status: 400 });
  }

  console.log('[DBG][resolve-domain] Resolving domain:', domain);

  try {
    const tenant = await getTenantByDomain(domain);

    if (tenant) {
      // Tenant and Expert are now merged - tenant.id is both tenantId and expertId
      const isLandingPagePublished = tenant.isLandingPagePublished ?? false;

      console.log(
        '[DBG][resolve-domain] Found tenant:',
        tenant.id,
        'published:',
        isLandingPagePublished
      );

      return NextResponse.json({
        tenantId: tenant.id,
        expertId: tenant.id, // Same as tenantId now
        isLandingPagePublished,
      });
    }

    console.log('[DBG][resolve-domain] No tenant found for domain:', domain);
    return NextResponse.json({ tenantId: null, expertId: null, isLandingPagePublished: false });
  } catch (error) {
    console.error('[DBG][resolve-domain] Error resolving domain:', error);
    return NextResponse.json({ error: 'Failed to resolve domain' }, { status: 500 });
  }
}
