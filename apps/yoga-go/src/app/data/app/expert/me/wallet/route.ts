import { NextResponse } from 'next/server';
import type { ApiResponse, ExpertWallet } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as walletRepository from '@/lib/repositories/walletRepository';

/**
 * GET /data/app/expert/me/wallet
 * Get current expert's wallet balance
 */
export async function GET() {
  console.log('[DBG][wallet/route.ts] GET /data/app/expert/me/wallet called');

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      console.log('[DBG][wallet/route.ts] Unauthorized - no session');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse<ExpertWallet>,
        { status: 401 }
      );
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      console.log('[DBG][wallet/route.ts] User not found');
      return NextResponse.json(
        { success: false, error: 'User not found' } as ApiResponse<ExpertWallet>,
        { status: 404 }
      );
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      console.log('[DBG][wallet/route.ts] User is not an expert');
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<ExpertWallet>,
        { status: 403 }
      );
    }

    const expertId = user.expertProfile;

    // Get or create wallet (auto-creates if doesn't exist)
    const wallet = await walletRepository.getOrCreateWallet(expertId);

    console.log('[DBG][wallet/route.ts] Wallet found:', wallet.id, 'balance:', wallet.balance);
    return NextResponse.json({ success: true, data: wallet } as ApiResponse<ExpertWallet>);
  } catch (error) {
    console.error('[DBG][wallet/route.ts] Error fetching wallet:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch wallet',
      } as ApiResponse<ExpertWallet>,
      { status: 500 }
    );
  }
}

/**
 * POST /data/app/expert/me/wallet
 * Initialize wallet with preferred currency
 * Body: { currency: 'USD' | 'INR' }
 */
export async function POST(request: Request) {
  console.log('[DBG][wallet/route.ts] POST /data/app/expert/me/wallet called');

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      console.log('[DBG][wallet/route.ts] Unauthorized - no session');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse<ExpertWallet>,
        { status: 401 }
      );
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      console.log('[DBG][wallet/route.ts] User not found');
      return NextResponse.json(
        { success: false, error: 'User not found' } as ApiResponse<ExpertWallet>,
        { status: 404 }
      );
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      console.log('[DBG][wallet/route.ts] User is not an expert');
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<ExpertWallet>,
        { status: 403 }
      );
    }

    const expertId = user.expertProfile;

    // Parse request body
    const body = await request.json();
    const currency = body.currency || 'USD';

    if (!['USD', 'INR'].includes(currency)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid currency. Supported: USD, INR',
        } as ApiResponse<ExpertWallet>,
        { status: 400 }
      );
    }

    // Create wallet with specified currency
    const wallet = await walletRepository.getOrCreateWallet(expertId, currency);

    console.log('[DBG][wallet/route.ts] Wallet initialized:', wallet.id);
    return NextResponse.json({ success: true, data: wallet } as ApiResponse<ExpertWallet>);
  } catch (error) {
    console.error('[DBG][wallet/route.ts] Error creating wallet:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create wallet',
      } as ApiResponse<ExpertWallet>,
      { status: 500 }
    );
  }
}
