import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PAYMENT_CONFIG } from '@/config/payment';
import { connectToDatabase } from '@/lib/mongodb';
import SubscriptionModel from '@/models/Subscription';
import User from '@/models/User';

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
    const {
      subscriptionId,
      userId,
      reason,
    }: { subscriptionId: string; userId: string; reason?: string } = body;

    console.log('[DBG][stripe-cancel] Cancelling subscription:', subscriptionId);

    // Validate required fields
    if (!subscriptionId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const stripe = getStripeInstance();
    await connectToDatabase();

    // Find subscription record
    const subscription = await SubscriptionModel.findOne({
      _id: subscriptionId,
      userId,
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Check if subscription is already cancelled
    if (subscription.status === 'cancelled' || subscription.status === 'expired') {
      return NextResponse.json(
        { success: false, error: 'Subscription is already cancelled' },
        { status: 400 }
      );
    }

    // Cancel subscription at period end (user keeps access until then)
    const stripeSubscription = await stripe.subscriptions.update(
      subscription.gatewaySubscriptionId,
      {
        cancel_at_period_end: true,
        cancellation_details: reason
          ? {
              comment: reason,
            }
          : undefined,
      }
    );

    console.log('[DBG][stripe-cancel] Stripe subscription updated:', stripeSubscription.id);

    // Update subscription record
    subscription.cancelAtPeriodEnd = true;
    subscription.cancelledAt = new Date();
    subscription.cancelReason = reason;
    subscription.status = 'cancelled'; // Mark as cancelled but user still has access until currentPeriodEnd
    await subscription.save();

    // Update user membership
    const user = await User.findById(userId);
    if (user) {
      user.membership.cancelAtPeriodEnd = true;
      user.membership.cancelledAt = new Date().toISOString();
      user.membership.status = 'active'; // Still active until period ends
      await user.save();
      console.log('[DBG][stripe-cancel] User membership updated');
    }

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId: stripeSubscription.id,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        message: 'Subscription will be cancelled at the end of the current billing period',
      },
    });
  } catch (error) {
    console.error('[DBG][stripe-cancel] Cancellation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
      },
      { status: 500 }
    );
  }
}

// Endpoint to reactivate a cancelled subscription
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { subscriptionId, userId }: { subscriptionId: string; userId: string } = body;

    console.log('[DBG][stripe-reactivate] Reactivating subscription:', subscriptionId);

    // Validate required fields
    if (!subscriptionId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const stripe = getStripeInstance();
    await connectToDatabase();

    // Find subscription record
    const subscription = await SubscriptionModel.findOne({
      _id: subscriptionId,
      userId,
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Check if subscription can be reactivated
    if (!subscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        { success: false, error: 'Subscription is not set to cancel' },
        { status: 400 }
      );
    }

    // Reactivate subscription
    const stripeSubscription = await stripe.subscriptions.update(
      subscription.gatewaySubscriptionId,
      {
        cancel_at_period_end: false,
      }
    );

    console.log('[DBG][stripe-reactivate] Stripe subscription reactivated:', stripeSubscription.id);

    // Update subscription record
    subscription.cancelAtPeriodEnd = false;
    subscription.status = 'active';
    subscription.cancelledAt = undefined;
    subscription.cancelReason = undefined;
    await subscription.save();

    // Update user membership
    const user = await User.findById(userId);
    if (user) {
      user.membership.cancelAtPeriodEnd = false;
      user.membership.cancelledAt = undefined;
      user.membership.status = 'active';
      await user.save();
      console.log('[DBG][stripe-reactivate] User membership reactivated');
    }

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId: stripeSubscription.id,
        status: 'active',
        message: 'Subscription has been reactivated',
      },
    });
  } catch (error) {
    console.error('[DBG][stripe-reactivate] Reactivation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reactivate subscription',
      },
      { status: 500 }
    );
  }
}
