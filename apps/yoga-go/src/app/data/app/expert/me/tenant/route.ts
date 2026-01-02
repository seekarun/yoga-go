import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { ApiResponse, Tenant } from '@/types';
import { requireExpertAuthDual } from '@/lib/auth';
import * as tenantRepository from '@/lib/repositories/tenantRepository';

/**
 * GET /data/app/expert/me/tenant
 * Get the current expert's tenant (custom domain info)
 *
 * Supports dual auth: cookies (web) or Bearer token (mobile)
 */
export async function GET(request: NextRequest) {
  console.log('[DBG][tenant/route.ts] GET called');

  try {
    // Require expert authentication (supports both cookies and Bearer token)
    const { user, session } = await requireExpertAuthDual(request);
    console.log('[DBG][tenant/route.ts] Authenticated via', session.authType);

    if (!user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<Tenant>,
        { status: 404 }
      );
    }

    const expertId = user.expertProfile;

    // Get tenant by expert ID
    const tenant = await tenantRepository.getTenantByExpertId(expertId);

    if (!tenant) {
      // No tenant configured - return null (expert uses default subdomain)
      return NextResponse.json({
        success: true,
        data: null,
      } as ApiResponse<Tenant | null>);
    }

    console.log('[DBG][tenant/route.ts] Found tenant:', tenant.primaryDomain);
    return NextResponse.json({ success: true, data: tenant } as ApiResponse<Tenant>);
  } catch (error) {
    console.error('[DBG][tenant/route.ts] Error:', error);

    // Handle auth errors with appropriate status
    const errorMessage = error instanceof Error ? error.message : 'Failed to get tenant';
    const status =
      errorMessage === 'Unauthorized' ? 401 : errorMessage.includes('Forbidden') ? 403 : 500;

    return NextResponse.json({ success: false, error: errorMessage } as ApiResponse<Tenant>, {
      status,
    });
  }
}
