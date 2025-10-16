import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PAYMENT_CONFIG } from '@/config/payment';
import { connectToDatabase } from '@/lib/mongodb';
import Payment from '@/models/Payment';
import { nanoid } from 'nanoid';

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

    // Store payment record in database
    await connectToDatabase();
    const paymentId = nanoid();

    const payment = new Payment({
      _id: paymentId,
      userId,
      courseId: type === 'course' ? itemId : undefined,
      itemType: type === 'course' ? 'course_enrollment' : 'subscription',
      itemId,
      amount,
      currency: currency.toUpperCase(),
      gateway: 'stripe',
      status: 'initiated',
      paymentIntentId: paymentIntent.id,
      initiatedAt: new Date(),
      metadata: {
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    await payment.save();
    console.log('[DBG][stripe] Payment record saved:', paymentId);

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        paymentId,
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
