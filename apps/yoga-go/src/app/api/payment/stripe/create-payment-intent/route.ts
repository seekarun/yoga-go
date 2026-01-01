import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PAYMENT_CONFIG } from '@/config/payment';
import * as paymentRepository from '@/lib/repositories/paymentRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
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

    // For course/webinar purchases, look up expert's Stripe Connect account
    let expertStripeAccountId: string | undefined;
    let applicationFeeAmount: number | undefined;
    let expertId: string | undefined;

    if (type === 'course') {
      const course = await courseRepository.getCourseByIdOnly(itemId);
      if (!course) {
        return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
      }
      expertId = course.instructor.id;
    } else if (type === 'webinar') {
      const webinar = await webinarRepository.getWebinarByIdOnly(itemId);
      if (!webinar) {
        return NextResponse.json({ success: false, error: 'Webinar not found' }, { status: 404 });
      }
      expertId = webinar.expertId;
    }

    // Check if expert has active Stripe Connect
    if (expertId) {
      const expert = await expertRepository.getExpertById(expertId);

      if (expert?.stripeConnect?.status === 'active' && expert?.stripeConnect?.chargesEnabled) {
        expertStripeAccountId = expert.stripeConnect.accountId;
        applicationFeeAmount = calculatePlatformFee(amount); // Platform fee percentage

        console.log('[DBG][stripe] Using Connect with on_behalf_of:', {
          type,
          connectedAccount: expertStripeAccountId,
          platformFee: applicationFeeAmount,
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
    // Using on_behalf_of for cross-region support (platform in AU, expert in US)
    // This processes the charge in the connected account's country
    if (expertStripeAccountId && applicationFeeAmount !== undefined) {
      paymentIntentParams.on_behalf_of = expertStripeAccountId;
      paymentIntentParams.transfer_data = { destination: expertStripeAccountId };
      paymentIntentParams.application_fee_amount = applicationFeeAmount;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    console.log('[DBG][stripe] PaymentIntent created:', paymentIntent.id);

    // Store payment record in DynamoDB (include Connect info in metadata)
    const payment = await paymentRepository.createPayment({
      userId,
      courseId: type === 'course' ? itemId : undefined,
      webinarId: type === 'webinar' ? itemId : undefined,
      itemType: type === 'webinar' ? 'webinar_registration' : 'course_enrollment',
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
        expertId,
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
