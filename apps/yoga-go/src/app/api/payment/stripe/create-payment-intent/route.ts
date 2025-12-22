import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PAYMENT_CONFIG } from '@/config/payment';
import * as paymentRepository from '@/lib/repositories/paymentRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
import * as expertRepository from '@/lib/repositories/expertRepository';
import { calculatePlatformFee } from '@/lib/stripe-connect';

function getStripeInstance() {
  if (!PAYMENT_CONFIG.stripe.secretKey) {
    throw new Error('Stripe secret key not configured');
  }
  return new Stripe(PAYMENT_CONFIG.stripe.secretKey, {
    apiVersion: '2025-10-29.clover',
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

    // For course purchases, look up expert's Stripe Connect account
    let transferData: { destination: string } | undefined;
    let applicationFeeAmount: number | undefined;
    let expertStripeAccountId: string | undefined;

    if (type === 'course') {
      const course = await courseRepository.getCourseById(itemId);
      if (!course) {
        return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
      }

      const expertId = course.instructor.id;
      const expert = await expertRepository.getExpertById(expertId);

      // Check if expert has active Stripe Connect
      if (expert?.stripeConnect?.status === 'active' && expert?.stripeConnect?.chargesEnabled) {
        expertStripeAccountId = expert.stripeConnect.accountId;
        transferData = { destination: expertStripeAccountId };
        applicationFeeAmount = calculatePlatformFee(amount); // 5% platform fee

        console.log('[DBG][stripe] Using Connect transfer:', {
          destination: expertStripeAccountId,
          fee: applicationFeeAmount,
          expertGets: amount - applicationFeeAmount,
        });
      } else {
        // Expert doesn't have Connect - all funds go to platform
        console.log('[DBG][stripe] Expert not on Connect, platform keeps all funds');
      }
    }

    // Build PaymentIntent params
    const stripe = getStripeInstance();
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
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
    };

    // Add Connect parameters if expert has connected account
    if (transferData && applicationFeeAmount !== undefined) {
      paymentIntentParams.transfer_data = transferData;
      paymentIntentParams.application_fee_amount = applicationFeeAmount;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    console.log('[DBG][stripe] PaymentIntent created:', paymentIntent.id);

    // Store payment record in DynamoDB (include Connect info in metadata)
    const payment = await paymentRepository.createPayment({
      userId,
      courseId: type === 'course' ? itemId : undefined,
      itemType: 'course_enrollment',
      itemId,
      amount,
      currency: currency.toUpperCase(),
      gateway: 'stripe',
      status: 'initiated',
      paymentIntentId: paymentIntent.id,
      initiatedAt: new Date().toISOString(),
      metadata: {
        userAgent: request.headers.get('user-agent') || undefined,
        connectAccountId: expertStripeAccountId,
        platformFee: applicationFeeAmount,
      },
    });

    console.log('[DBG][stripe] Payment record saved:', payment.id);

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        paymentId: payment.id,
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
