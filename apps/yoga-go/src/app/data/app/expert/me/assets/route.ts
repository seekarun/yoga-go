import { NextResponse } from 'next/server';
import type { ApiResponse, Asset } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as assetRepository from '@/lib/repositories/assetRepository';

/**
 * GET /data/app/expert/me/assets
 * Get all assets for the current expert
 */
export async function GET() {
  console.log('[DBG][expert/me/assets/route.ts] GET /data/app/expert/me/assets called');

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session || !session.user || !session.user.cognitoSub) {
      console.log('[DBG][expert/me/assets/route.ts] Unauthorized - no session');
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<Asset[]>, {
        status: 401,
      });
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);

    if (!user) {
      console.log('[DBG][expert/me/assets/route.ts] User not found');
      return NextResponse.json(
        { success: false, error: 'User not found' } as ApiResponse<Asset[]>,
        { status: 404 }
      );
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';

    if (!isExpert) {
      console.log('[DBG][expert/me/assets/route.ts] User is not an expert');
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<Asset[]>,
        { status: 403 }
      );
    }

    if (!user.expertProfile) {
      console.log('[DBG][expert/me/assets/route.ts] Expert profile not found');
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<Asset[]>,
        { status: 404 }
      );
    }

    // Get all assets for this expert (tenant)
    const assets = await assetRepository.getAssetsByTenant(user.expertProfile);

    console.log('[DBG][expert/me/assets/route.ts] Found', assets.length, 'assets');
    return NextResponse.json({
      success: true,
      data: assets,
    } as ApiResponse<Asset[]>);
  } catch (error) {
    console.error('[DBG][expert/me/assets/route.ts] Error fetching assets:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch assets',
      } as ApiResponse<Asset[]>,
      { status: 500 }
    );
  }
}
