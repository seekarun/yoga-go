import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PAYMENT_CONFIG } from '@/config/payment';
import { connectToDatabase } from '@/lib/mongodb';
import Payment from '@/models/Payment';

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
    const { paymentIntentId, type, itemId, userId } = body;

    // Validate required fields
    if (!paymentIntentId || !type || !itemId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Retrieve and verify payment intent from Stripe
    const stripe = getStripeInstance();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Verify payment was successful
    if (paymentIntent.status !== 'succeeded') {
      console.error('[DBG][stripe] Payment not succeeded:', paymentIntent.status);

      // Update payment status to failed
      await connectToDatabase();
      await Payment.updateOne(
        { paymentIntentId },
        {
          $set: {
            status: 'failed',
            failedAt: new Date(),
            'metadata.errorMessage': `Payment status: ${paymentIntent.status}`,
          },
        }
      );

      return NextResponse.json(
        { success: false, error: `Payment not completed. Status: ${paymentIntent.status}` },
        { status: 400 }
      );
    }

    // Verify metadata matches
    if (
      paymentIntent.metadata.type !== type ||
      paymentIntent.metadata.itemId !== itemId ||
      paymentIntent.metadata.userId !== userId
    ) {
      console.error('[DBG][stripe] Metadata mismatch');
      return NextResponse.json(
        { success: false, error: 'Payment verification failed: metadata mismatch' },
        { status: 400 }
      );
    }

    console.log('[DBG][stripe] Payment verified successfully:', paymentIntentId);

    // Update payment status to succeeded
    await connectToDatabase();
    await Payment.updateOne(
      { paymentIntentId },
      {
        $set: {
          status: 'succeeded',
          completedAt: new Date(),
          'metadata.chargeId': paymentIntent.latest_charge,
        },
      }
    );

    // Grant access based on type
    if (type === 'course') {
      // Enroll user in course
      const { enrollUserInCourse } = await import('@/lib/enrollment');
      const enrollResult = await enrollUserInCourse(userId, itemId, paymentIntentId);

      if (!enrollResult.success) {
        console.error('[DBG][stripe] Enrollment failed:', enrollResult.error);
        return NextResponse.json(
          {
            success: false,
            error: `Payment verified but enrollment failed: ${enrollResult.error}`,
          },
          { status: 500 }
        );
      }

      console.log(`[DBG][stripe] Enrolled user ${userId} in course ${itemId}`);
    } else if (type === 'subscription') {
      // Update user membership
      const { connectToDatabase } = await import('@/lib/mongodb');
      const User = (await import('@/models/User')).default;

      await connectToDatabase();
      const user = await User.findById(userId);

      if (user) {
        const now = new Date().toISOString();
        const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

        user.membership = {
          type: itemId as 'free' | 'basic' | 'premium' | 'lifetime',
          status: 'active',
          startDate: now,
          renewalDate: oneYearFromNow,
          benefits: [],
        };

        // Add payment to history
        if (!user.billing) {
          user.billing = { paymentHistory: [] };
        }
        if (!user.billing.paymentHistory) {
          user.billing.paymentHistory = [];
        }

        user.billing.paymentHistory.push({
          date: now,
          amount: paymentIntent.amount,
          method: 'online',
          status: 'paid',
          description: `Subscription: ${itemId}`,
          invoice: paymentIntentId,
        });

        await user.save();
      }

      console.log(`[DBG][stripe] Updated user ${userId} subscription to ${itemId}`);
    }

    // TODO: Send confirmation email
    // await sendEmail({
    //   to: userEmail,
    //   subject: 'Payment Confirmation',
    //   template: 'payment-success',
    //   data: { paymentId: paymentIntentId, itemName, amount },
    // });

    return NextResponse.json({
      success: true,
      data: {
        paymentId: paymentIntentId,
        message: 'Payment verified successfully',
      },
    });
  } catch (error) {
    console.error('[DBG][stripe] Verification failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Payment verification failed',
      },
      { status: 500 }
    );
  }
}
