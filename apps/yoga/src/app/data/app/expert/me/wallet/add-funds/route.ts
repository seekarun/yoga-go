import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { ApiResponse, ExpertWallet, WalletTransaction } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as walletRepository from '@/lib/repositories/walletRepository';
import { PAYMENT_CONFIG } from '@/config/payment';

interface AddFundsResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

interface ConfirmFundsResponse {
  wallet: ExpertWallet;
  transaction: WalletTransaction;
}

function getStripeInstance() {
  if (!PAYMENT_CONFIG.stripe.secretKey) {
    throw new Error('Stripe secret key not configured');
  }
  return new Stripe(PAYMENT_CONFIG.stripe.secretKey, {
    apiVersion: '2025-10-29.clover',
  });
}

/**
 * POST /data/app/expert/me/wallet/add-funds
 * Create a payment intent to add funds to wallet
 * Body: { amount: number (in cents), currency: 'USD' | 'INR' }
 */
export async function POST(request: Request) {
  console.log('[DBG][wallet/add-funds/route.ts] POST called');

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      console.log('[DBG][wallet/add-funds/route.ts] Unauthorized - no session');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse<AddFundsResponse>,
        { status: 401 }
      );
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      console.log('[DBG][wallet/add-funds/route.ts] User not found');
      return NextResponse.json(
        { success: false, error: 'User not found' } as ApiResponse<AddFundsResponse>,
        { status: 404 }
      );
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      console.log('[DBG][wallet/add-funds/route.ts] User is not an expert');
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<AddFundsResponse>,
        { status: 403 }
      );
    }

    const expertId = user.expertProfile;

    // Parse request body
    const body = await request.json();
    const { amount, currency = 'USD' } = body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount < 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Minimum amount is 100 cents ($1 or Rs. 1)',
        } as ApiResponse<AddFundsResponse>,
        { status: 400 }
      );
    }

    // Validate currency
    if (!['USD', 'INR'].includes(currency)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid currency. Supported: USD, INR',
        } as ApiResponse<AddFundsResponse>,
        { status: 400 }
      );
    }

    // Ensure wallet exists
    await walletRepository.getOrCreateWallet(expertId, currency);

    // Create Stripe PaymentIntent
    const stripe = getStripeInstance();
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      metadata: {
        type: 'wallet_deposit',
        expertId,
        userId: user.id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('[DBG][wallet/add-funds/route.ts] PaymentIntent created:', paymentIntent.id);

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret as string,
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
      },
    } as ApiResponse<AddFundsResponse>);
  } catch (error) {
    console.error('[DBG][wallet/add-funds/route.ts] Error creating payment intent:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
      } as ApiResponse<AddFundsResponse>,
      { status: 500 }
    );
  }
}

/**
 * PUT /data/app/expert/me/wallet/add-funds
 * Confirm payment and add funds to wallet
 * Body: { paymentIntentId: string }
 */
export async function PUT(request: Request) {
  console.log('[DBG][wallet/add-funds/route.ts] PUT called');

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      console.log('[DBG][wallet/add-funds/route.ts] Unauthorized - no session');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse<ConfirmFundsResponse>,
        { status: 401 }
      );
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      console.log('[DBG][wallet/add-funds/route.ts] User not found');
      return NextResponse.json(
        { success: false, error: 'User not found' } as ApiResponse<ConfirmFundsResponse>,
        { status: 404 }
      );
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      console.log('[DBG][wallet/add-funds/route.ts] User is not an expert');
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<ConfirmFundsResponse>,
        { status: 403 }
      );
    }

    const expertId = user.expertProfile;

    // Parse request body
    const body = await request.json();
    const { paymentIntentId } = body;

    if (!paymentIntentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment intent ID required',
        } as ApiResponse<ConfirmFundsResponse>,
        { status: 400 }
      );
    }

    // Verify payment with Stripe
    const stripe = getStripeInstance();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log('[DBG][wallet/add-funds/route.ts] PaymentIntent status:', paymentIntent.status);

    // Check if payment succeeded
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        {
          success: false,
          error: `Payment not completed. Status: ${paymentIntent.status}`,
        } as ApiResponse<ConfirmFundsResponse>,
        { status: 400 }
      );
    }

    // Verify this payment is for wallet deposit
    if (paymentIntent.metadata.type !== 'wallet_deposit') {
      return NextResponse.json(
        { success: false, error: 'Invalid payment type' } as ApiResponse<ConfirmFundsResponse>,
        { status: 400 }
      );
    }

    // Verify this payment is for the current expert
    if (paymentIntent.metadata.expertId !== expertId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment does not belong to this expert',
        } as ApiResponse<ConfirmFundsResponse>,
        { status: 403 }
      );
    }

    // Add funds to wallet
    const result = await walletRepository.addFunds({
      expertId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
      paymentIntentId: paymentIntent.id,
      description: `Wallet deposit via Stripe`,
      metadata: {
        stripePaymentIntentId: paymentIntent.id,
        stripePaymentMethodId: paymentIntent.payment_method,
      },
    });

    console.log('[DBG][wallet/add-funds/route.ts] Funds added:', result.transaction.id);

    return NextResponse.json({
      success: true,
      data: result,
    } as ApiResponse<ConfirmFundsResponse>);
  } catch (error) {
    console.error('[DBG][wallet/add-funds/route.ts] Error confirming payment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm payment',
      } as ApiResponse<ConfirmFundsResponse>,
      { status: 500 }
    );
  }
}
