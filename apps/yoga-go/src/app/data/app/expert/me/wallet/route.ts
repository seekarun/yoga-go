import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { ApiResponse, ExpertWallet } from '@/types';
import { requireExpertAuthDual } from '@/lib/auth';
import * as walletRepository from '@/lib/repositories/walletRepository';

/**
 * GET /data/app/expert/me/wallet
 * Get current expert's wallet balance
 *
 * Supports dual auth: cookies (web) or Bearer token (mobile)
 */
export async function GET(request: NextRequest) {
  console.log('[DBG][wallet/route.ts] GET /data/app/expert/me/wallet called');

  try {
    // Require expert authentication (supports both cookies and Bearer token)
    const { user, session } = await requireExpertAuthDual(request);
    console.log('[DBG][wallet/route.ts] Authenticated via', session.authType);

    if (!user.expertProfile) {
      console.log('[DBG][wallet/route.ts] Expert profile not found');
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<ExpertWallet>,
        { status: 404 }
      );
    }

    const expertId = user.expertProfile;

    // Get or create wallet (auto-creates if doesn't exist)
    const wallet = await walletRepository.getOrCreateWallet(expertId);

    console.log('[DBG][wallet/route.ts] Wallet found:', wallet.id, 'balance:', wallet.balance);
    return NextResponse.json({ success: true, data: wallet } as ApiResponse<ExpertWallet>);
  } catch (error) {
    console.error('[DBG][wallet/route.ts] Error fetching wallet:', error);

    // Handle auth errors with appropriate status
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch wallet';
    const status =
      errorMessage === 'Unauthorized' ? 401 : errorMessage.includes('Forbidden') ? 403 : 500;

    return NextResponse.json({ success: false, error: errorMessage } as ApiResponse<ExpertWallet>, {
      status,
    });
  }
}

/**
 * POST /data/app/expert/me/wallet
 * Initialize wallet with preferred currency
 * Body: { currency: 'USD' | 'INR' }
 *
 * Supports dual auth: cookies (web) or Bearer token (mobile)
 */
export async function POST(request: NextRequest) {
  console.log('[DBG][wallet/route.ts] POST /data/app/expert/me/wallet called');

  try {
    // Require expert authentication (supports both cookies and Bearer token)
    const { user, session } = await requireExpertAuthDual(request);
    console.log('[DBG][wallet/route.ts] Authenticated via', session.authType);

    if (!user.expertProfile) {
      console.log('[DBG][wallet/route.ts] Expert profile not found');
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<ExpertWallet>,
        { status: 404 }
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

    // Handle auth errors with appropriate status
    const errorMessage = error instanceof Error ? error.message : 'Failed to create wallet';
    const status =
      errorMessage === 'Unauthorized' ? 401 : errorMessage.includes('Forbidden') ? 403 : 500;

    return NextResponse.json({ success: false, error: errorMessage } as ApiResponse<ExpertWallet>, {
      status,
    });
  }
}
