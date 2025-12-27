/**
 * API Route: Get Razorpay Route Status
 *
 * GET /api/razorpay/route/status
 * - Returns expert's Razorpay Route (linked account) status
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';

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

    // Return Razorpay Route status
    if (!expert.razorpayRoute) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'not_connected',
          message: 'Bank account not connected for Razorpay payouts',
        },
      });
    }

    // TODO: When Razorpay Route is enabled, sync status from Razorpay API
    // const razorpay = getRazorpayInstance();
    // const account = await razorpay.accounts.fetch(expert.razorpayRoute.accountId);
    // if (account.status !== expert.razorpayRoute.status) {
    //   await expertRepository.updateRazorpayRoute(expert.id, { status: account.status });
    // }

    return NextResponse.json({
      success: true,
      data: {
        accountId: expert.razorpayRoute.accountId,
        status: expert.razorpayRoute.status,
        transfersEnabled: expert.razorpayRoute.transfersEnabled,
        activatedAt: expert.razorpayRoute.activatedAt,
        legalBusinessName: expert.razorpayRoute.legalBusinessName,
        email: expert.razorpayRoute.email,
        bankAccount: expert.razorpayRoute.bankAccount,
        commissionRate: expert.razorpayRoute.commissionRate,
      },
    });
  } catch (error) {
    console.error('[DBG][razorpay-route] Error getting status:', error);
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
 * DELETE /api/razorpay/route/status
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

    if (!expert.razorpayRoute) {
      return NextResponse.json(
        {
          success: false,
          error: 'No bank account connected',
        },
        { status: 400 }
      );
    }

    // TODO: When Razorpay Route is enabled, also delete linked account via API
    // Note: Razorpay may not allow deletion if there are pending transfers

    // Remove Razorpay Route details from expert profile
    await expertRepository.updateExpert(expert.id, { razorpayRoute: undefined });

    console.log('[DBG][razorpay-route] Removed bank details for expert:', expert.id);

    return NextResponse.json({
      success: true,
      message: 'Bank account disconnected successfully',
    });
  } catch (error) {
    console.error('[DBG][razorpay-route] Error removing bank details:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect bank account',
      },
      { status: 500 }
    );
  }
}
