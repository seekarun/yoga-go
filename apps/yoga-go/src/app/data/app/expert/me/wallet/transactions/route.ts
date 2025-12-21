import { NextResponse } from 'next/server';
import type { ApiResponse, WalletTransaction } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as walletRepository from '@/lib/repositories/walletRepository';

interface TransactionsResponse {
  transactions: WalletTransaction[];
  count: number;
}

/**
 * GET /data/app/expert/me/wallet/transactions
 * Get wallet transactions for current expert
 * Query params: limit (default 50)
 */
export async function GET(request: Request) {
  console.log('[DBG][wallet/transactions/route.ts] GET called');

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      console.log('[DBG][wallet/transactions/route.ts] Unauthorized - no session');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse<TransactionsResponse>,
        { status: 401 }
      );
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      console.log('[DBG][wallet/transactions/route.ts] User not found');
      return NextResponse.json(
        { success: false, error: 'User not found' } as ApiResponse<TransactionsResponse>,
        { status: 404 }
      );
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      console.log('[DBG][wallet/transactions/route.ts] User is not an expert');
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<TransactionsResponse>,
        { status: 403 }
      );
    }

    const expertId = user.expertProfile;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    // Get transactions
    const transactions = await walletRepository.getTransactionsByExpert(expertId, limit);

    console.log('[DBG][wallet/transactions/route.ts] Found', transactions.length, 'transactions');
    return NextResponse.json({
      success: true,
      data: {
        transactions,
        count: transactions.length,
      },
    } as ApiResponse<TransactionsResponse>);
  } catch (error) {
    console.error('[DBG][wallet/transactions/route.ts] Error fetching transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transactions',
      } as ApiResponse<TransactionsResponse>,
      { status: 500 }
    );
  }
}
