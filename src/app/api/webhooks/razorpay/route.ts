import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { PAYMENT_CONFIG } from '@/config/payment';

/**
 * Razorpay Webhook Handler
 *
 * Handles events from Razorpay:
 * - payment.captured: Payment successful
 * - payment.failed: Payment failed
 * - subscription.charged: Subscription payment
 * - subscription.cancelled: Subscription cancelled
 *
 * Setup: Add this URL in Razorpay Dashboard > Settings > Webhooks
 * URL: https://yourdomain.com/api/webhooks/razorpay
 */

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('[Razorpay Webhook] Missing signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', PAYMENT_CONFIG.razorpay.keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('[Razorpay Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    console.log('[Razorpay Webhook] Received event:', event.event);

    // Handle different event types
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(event.payload.subscription.entity);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.payload.subscription.entity);
        break;

      default:
        console.log('[Razorpay Webhook] Unhandled event type:', event.event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Razorpay Webhook] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentCaptured(payment: any) {
  console.log('[Razorpay Webhook] Payment captured:', payment.id);

  // TODO: Update payment status in database
  // const notes = payment.notes;
  // await db.payments.update({
  //   where: { paymentId: payment.id },
  //   data: { status: 'captured' },
  // });

  // TODO: Grant access if not already done
  // This is a backup in case the frontend verification didn't complete
}

async function handlePaymentFailed(payment: any) {
  console.log('[Razorpay Webhook] Payment failed:', payment.id);

  // TODO: Update payment status
  // await db.payments.update({
  //   where: { paymentId: payment.id },
  //   data: {
  //     status: 'failed',
  //     errorCode: payment.error_code,
  //     errorDescription: payment.error_description,
  //   },
  // });

  // TODO: Send failure notification email
}

async function handleSubscriptionCharged(subscription: any) {
  console.log('[Razorpay Webhook] Subscription charged:', subscription.id);

  // TODO: Record subscription payment
  // TODO: Extend subscription period
  // TODO: Send invoice email
}

async function handleSubscriptionCancelled(subscription: any) {
  console.log('[Razorpay Webhook] Subscription cancelled:', subscription.id);

  // TODO: Update subscription status
  // await db.subscriptions.update({
  //   where: { subscriptionId: subscription.id },
  //   data: {
  //     status: 'cancelled',
  //     cancelledAt: new Date(),
  //   },
  // });

  // TODO: Send cancellation confirmation email
}
