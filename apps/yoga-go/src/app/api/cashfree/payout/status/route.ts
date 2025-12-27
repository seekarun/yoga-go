/**
 * API Route: Get Cashfree Payout Status
 *
 * GET /api/cashfree/payout/status
 * - Returns expert's Cashfree Payout (beneficiary) status
 *
 * DELETE /api/cashfree/payout/status
 * - Disconnect/remove bank account details
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as cashfreePayout from '@/lib/cashfree-payout';

export async function GET() {
  try {
    // Get authenticated session
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get expert profile
    const expert = await expertRepository.getExpertByUserId(session.user.cognitoSub);
    if (!expert) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 404 }
      );
    }

    // Return Cashfree Payout status
    if (!expert.cashfreePayout) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'not_connected',
          message: 'Bank account not connected for Cashfree payouts',
        },
      });
    }

    // Sync status from Cashfree if beneficiary exists
    let currentStatus = expert.cashfreePayout.status;
    if (expert.cashfreePayout.beneficiaryId) {
      try {
        const syncedStatus = await cashfreePayout.getBeneficiaryStatus(
          expert.cashfreePayout.beneficiaryId
        );
        if (syncedStatus && syncedStatus !== currentStatus) {
          await expertRepository.updateCashfreePayout(expert.id, { status: syncedStatus });
          currentStatus = syncedStatus;
        }
      } catch (syncError) {
        console.error('[DBG][cashfree-payout] Error syncing status:', syncError);
        // Continue with existing status if sync fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        beneficiaryId: expert.cashfreePayout.beneficiaryId,
        status: currentStatus,
        bankAccount: expert.cashfreePayout.bankAccount,
        commissionRate: expert.cashfreePayout.commissionRate,
        lastUpdatedAt: expert.cashfreePayout.lastUpdatedAt,
      },
    });
  } catch (error) {
    console.error('[DBG][cashfree-payout] Error getting status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cashfree/payout/status
 * - Disconnect/remove bank account details
 */
export async function DELETE() {
  try {
    // Get authenticated session
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get expert profile
    const expert = await expertRepository.getExpertByUserId(session.user.cognitoSub);
    if (!expert) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 404 }
      );
    }

    if (!expert.cashfreePayout) {
      return NextResponse.json(
        {
          success: false,
          error: 'No bank account connected',
        },
        { status: 400 }
      );
    }

    // Remove beneficiary from Cashfree
    if (expert.cashfreePayout.beneficiaryId) {
      try {
        await cashfreePayout.removeBeneficiary(expert.cashfreePayout.beneficiaryId);
      } catch (removeError) {
        console.error('[DBG][cashfree-payout] Error removing beneficiary:', removeError);
        // Continue with local removal even if Cashfree removal fails
      }
    }

    // Remove Cashfree Payout details from expert profile
    await expertRepository.updateExpert(expert.id, { cashfreePayout: undefined });

    console.log('[DBG][cashfree-payout] Removed bank details for expert:', expert.id);

    return NextResponse.json({
      success: true,
      message: 'Bank account disconnected successfully',
    });
  } catch (error) {
    console.error('[DBG][cashfree-payout] Error removing bank details:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect bank account',
      },
      { status: 500 }
    );
  }
}
