import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PAYMENT_CONFIG } from '@/config/payment';
import * as paymentRepository from '@/lib/repositories/paymentRepository';
import * as userRepository from '@/lib/repositories/userRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import {
  sendInvoiceEmail,
  sendWebinarRegistrationEmail,
  getContextualFromEmail,
} from '@/lib/email';

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

    // Get the payment record from DynamoDB
    const existingPayment = await paymentRepository.getPaymentByIntentId(paymentIntentId);

    // Verify payment was successful
    if (paymentIntent.status !== 'succeeded') {
      console.error('[DBG][stripe] Payment not succeeded:', paymentIntent.status);

      // Update payment status to failed if we have the payment record
      if (existingPayment) {
        await paymentRepository.updatePaymentStatus(
          existingPayment.userId,
          existingPayment.id,
          'failed',
          {
            failedAt: new Date().toISOString(),
            metadata: {
              ...existingPayment.metadata,
              errorMessage: `Payment status: ${paymentIntent.status}`,
            },
          }
        );
      }

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
    if (existingPayment) {
      await paymentRepository.updatePaymentStatus(
        existingPayment.userId,
        existingPayment.id,
        'succeeded',
        {
          completedAt: new Date().toISOString(),
          metadata: {
            ...existingPayment.metadata,
            chargeId: paymentIntent.latest_charge as string,
          },
        }
      );
    }

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
    } else if (type === 'webinar') {
      // Register user for webinar
      const { registerUserForWebinar } = await import('@/lib/enrollment');
      const registrationResult = await registerUserForWebinar(userId, itemId, paymentIntentId);

      if (!registrationResult.success) {
        console.error('[DBG][stripe] Webinar registration failed:', registrationResult.error);
        return NextResponse.json(
          {
            success: false,
            error: `Payment verified but registration failed: ${registrationResult.error}`,
          },
          { status: 500 }
        );
      }

      console.log(`[DBG][stripe] Registered user ${userId} for webinar ${itemId}`);
    }

    // Send invoice/confirmation email
    try {
      const [user, course, webinar] = await Promise.all([
        userRepository.getUserById(userId),
        type === 'course' ? courseRepository.getCourseById(itemId) : null,
        type === 'webinar' ? webinarRepository.getWebinarById(itemId) : null,
      ]);

      if (user?.profile?.email) {
        const amount = paymentIntent.amount / 100; // Convert from cents
        const currency = paymentIntent.currency.toUpperCase();

        // Determine from address based on context (expert subdomain vs main domain)
        const referer = request.headers.get('referer');
        const expertId = course?.instructor?.id || webinar?.expertId || null;
        const fromEmail = getContextualFromEmail(expertId, referer);
        const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency;

        if (type === 'webinar' && webinar) {
          // Send webinar registration confirmation email
          await sendWebinarRegistrationEmail({
            to: user.profile.email,
            from: fromEmail,
            customerName: user.profile.name || 'Valued Customer',
            webinarTitle: webinar.title,
            webinarDescription: webinar.description?.slice(0, 200) || '',
            sessions: webinar.sessions.map(s => ({
              title: s.title,
              startTime: s.startTime,
              duration: s.duration,
            })),
            currency: currencySymbol,
            amount: amount.toFixed(2),
            transactionId: paymentIntentId,
          });
          console.log(
            `[DBG][stripe] Webinar registration email sent to ${user.profile.email} from ${fromEmail}`
          );
        } else {
          // Send course invoice email
          await sendInvoiceEmail({
            to: user.profile.email,
            from: fromEmail,
            customerName: user.profile.name || 'Valued Customer',
            orderId: paymentIntentId.slice(-8).toUpperCase(),
            orderDate: new Date().toLocaleDateString('en-AU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            paymentMethod: 'Credit Card (Stripe)',
            itemName: course?.title || 'Course Purchase',
            itemDescription: course?.description?.slice(0, 100) || 'Online yoga course access',
            currency: currencySymbol,
            amount: amount.toFixed(2),
            transactionId: paymentIntentId,
          });
          console.log(
            `[DBG][stripe] Invoice email sent to ${user.profile.email} from ${fromEmail}`
          );
        }
      } else {
        console.warn('[DBG][stripe] No user email found, skipping email');
      }
    } catch (emailError) {
      // Log but don't fail the payment if email fails
      console.error('[DBG][stripe] Failed to send email:', emailError);
    }

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
