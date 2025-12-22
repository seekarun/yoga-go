import { NextResponse } from 'next/server';
import type { ApiResponse, Tenant } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as tenantRepository from '@/lib/repositories/tenantRepository';

/**
 * GET /data/app/expert/me/tenant
 * Get the current expert's tenant (custom domain info)
 */
export async function GET() {
  console.log('[DBG][tenant/route.ts] GET called');

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<Tenant>, {
        status: 401,
      });
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<Tenant>, {
        status: 404,
      });
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<Tenant>,
        { status: 403 }
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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tenant',
      } as ApiResponse<Tenant>,
      { status: 500 }
    );
  }
}
