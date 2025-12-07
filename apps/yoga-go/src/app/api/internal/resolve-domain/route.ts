/**
 * Internal API route for domain resolution
 *
 * Called by Edge Middleware to resolve custom domains to tenants.
 * Runs in Node.js runtime so it can access DynamoDB reliably.
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
      console.log('[DBG][resolve-domain] Found tenant:', tenant.id, 'expert:', tenant.expertId);
      return NextResponse.json({
        tenantId: tenant.id,
        expertId: tenant.expertId,
      });
    }

    console.log('[DBG][resolve-domain] No tenant found for domain:', domain);
    return NextResponse.json({ tenantId: null, expertId: null });
  } catch (error) {
    console.error('[DBG][resolve-domain] Error resolving domain:', error);
    return NextResponse.json({ error: 'Failed to resolve domain' }, { status: 500 });
  }
}
