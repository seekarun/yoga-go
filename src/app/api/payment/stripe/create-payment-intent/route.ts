import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PAYMENT_CONFIG } from '@/config/payment';

function getStripeInstance() {
  if (!PAYMENT_CONFIG.stripe.secretKey) {
    throw new Error('Stripe secret key not configured');
  }
  return new Stripe(PAYMENT_CONFIG.stripe.secretKey, {
    apiVersion: '2025-09-30.clover',
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, currency, type, itemId, userId } = body;

    // Validate required fields
    if (!amount || !currency || !type || !itemId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create Stripe PaymentIntent
    const stripe = getStripeInstance();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // amount in smallest currency unit (cents)
      currency: currency.toLowerCase(),
      metadata: {
        type,
        itemId,
        userId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('[DBG][stripe] PaymentIntent created:', paymentIntent.id);

    // TODO: Store payment intent in database
    // await db.payments.create({
    //   paymentIntentId: paymentIntent.id,
    //   userId,
    //   amount,
    //   currency,
    //   type,
    //   itemId,
    //   status: 'pending',
    //   gateway: 'stripe',
    // });

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
    });
  } catch (error) {
    console.error('[DBG][stripe] PaymentIntent creation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
      },
      { status: 500 }
    );
  }
}
