import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { PAYMENT_CONFIG } from '@/config/payment';
import { connectToDatabase } from '@/lib/mongodb';
import SubscriptionModel from '@/models/Subscription';
import User from '@/models/User';
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
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('[DBG][stripe-webhook] No signature found');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    const webhookSecret = PAYMENT_CONFIG.stripe.webhookSecret;
    if (!webhookSecret) {
      console.error('[DBG][stripe-webhook] Webhook secret not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const stripe = getStripeInstance();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[DBG][stripe-webhook] Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

    console.log('[DBG][stripe-webhook] Event received:', event.type);

    await connectToDatabase();

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.trial_will_end':
        // TODO: Send notification to user about trial ending
        console.log(
          '[DBG][stripe-webhook] Trial ending soon for subscription:',
          event.data.object.id
        );
        break;

      default:
        console.log('[DBG][stripe-webhook] Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[DBG][stripe-webhook] Webhook processing failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  console.log('[DBG][stripe-webhook] Processing subscription update:', stripeSubscription.id);

  const subscription = await SubscriptionModel.findOne({
    gatewaySubscriptionId: stripeSubscription.id,
  });

  if (!subscription) {
    console.error('[DBG][stripe-webhook] Subscription not found:', stripeSubscription.id);
    return;
  }

  // Map Stripe status to our status
  const statusMap: Record<string, any> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'expired',
    incomplete: 'incomplete',
    incomplete_expired: 'expired',
    trialing: 'trialing',
  };

  const newStatus = statusMap[stripeSubscription.status] || 'active';

  // Update subscription record
  subscription.status = newStatus;
  subscription.currentPeriodStart = new Date(
    (stripeSubscription as any).current_period_start * 1000
  );
  subscription.currentPeriodEnd = new Date((stripeSubscription as any).current_period_end * 1000);
  subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
  subscription.nextBillingDate = stripeSubscription.cancel_at_period_end
    ? undefined
    : new Date((stripeSubscription as any).current_period_end * 1000);

  if (stripeSubscription.canceled_at) {
    subscription.cancelledAt = new Date(stripeSubscription.canceled_at * 1000);
  }

  // Extract payment method details
  const defaultPaymentMethod = stripeSubscription.default_payment_method;
  if (defaultPaymentMethod && typeof defaultPaymentMethod === 'object') {
    const pm = defaultPaymentMethod as Stripe.PaymentMethod;
    if (pm.card) {
      subscription.paymentMethod = {
        last4: pm.card.last4,
        brand: pm.card.brand,
        expiryMonth: pm.card.exp_month,
        expiryYear: pm.card.exp_year,
        type: 'card',
      };
    }
  }

  await subscription.save();
  console.log('[DBG][stripe-webhook] Subscription updated:', subscription._id);

  // Update user membership
  const user = await User.findById(subscription.userId);
  if (user) {
    user.membership.status =
      newStatus === 'active' || newStatus === 'trialing' ? 'active' : 'cancelled';
    user.membership.type = subscription.planType;
    user.membership.billingInterval = subscription.billingInterval;
    user.membership.currentPeriodEnd = subscription.currentPeriodEnd.toISOString();
    user.membership.cancelAtPeriodEnd = subscription.cancelAtPeriodEnd;
    user.membership.subscriptionId = subscription._id;
    user.membership.paymentGateway = 'stripe';

    if (newStatus === 'cancelled' || newStatus === 'expired') {
      user.membership.cancelledAt = new Date().toISOString();
    }

    await user.save();
    console.log('[DBG][stripe-webhook] User membership updated:', user._id);

    // TODO: Add PostHog server-side tracking here
    // Install posthog-node and track: 'subscription_updated', 'subscription_created', etc.
    // posthog.capture({ distinctId: userId, event: 'subscription_updated', properties: {...} })
  }
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  console.log('[DBG][stripe-webhook] Processing subscription deletion:', stripeSubscription.id);

  const subscription = await SubscriptionModel.findOne({
    gatewaySubscriptionId: stripeSubscription.id,
  });

  if (!subscription) {
    console.error('[DBG][stripe-webhook] Subscription not found:', stripeSubscription.id);
    return;
  }

  // Mark subscription as expired
  subscription.status = 'expired';
  subscription.cancelledAt = new Date();
  await subscription.save();

  // Update user membership
  const user = await User.findById(subscription.userId);
  if (user) {
    user.membership.status = 'expired';
    user.membership.cancelledAt = new Date().toISOString();
    await user.save();
    console.log('[DBG][stripe-webhook] User membership expired:', user._id);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('[DBG][stripe-webhook] Processing successful payment:', invoice.id);

  if (!(invoice as any).subscription) {
    console.log('[DBG][stripe-webhook] Invoice not related to subscription:', invoice.id);
    return;
  }

  const subscriptionId =
    typeof (invoice as any).subscription === 'string'
      ? (invoice as any).subscription
      : (invoice as any).subscription.id;

  const subscription = await SubscriptionModel.findOne({
    gatewaySubscriptionId: subscriptionId,
  });

  if (!subscription) {
    console.error('[DBG][stripe-webhook] Subscription not found for invoice:', invoice.id);
    return;
  }

  // Update last billing date
  subscription.lastBillingDate = new Date(invoice.created * 1000);
  subscription.failedPaymentCount = 0; // Reset failed payment count
  subscription.lastFailedPaymentAt = undefined;
  await subscription.save();

  // Create/update payment record
  const paymentIntentId =
    typeof (invoice as any).payment_intent === 'string'
      ? (invoice as any).payment_intent
      : (invoice as any).payment_intent?.id;

  if (paymentIntentId) {
    let payment = await Payment.findOne({ paymentIntentId });

    if (!payment) {
      // Create new payment record
      payment = new Payment({
        _id: nanoid(),
        userId: subscription.userId,
        itemType: 'subscription',
        itemId: subscription._id,
        amount: invoice.amount_paid,
        currency: invoice.currency.toUpperCase(),
        gateway: 'stripe',
        status: 'succeeded',
        paymentIntentId,
        initiatedAt: new Date(invoice.created * 1000),
        completedAt: new Date(invoice.status_transitions.paid_at! * 1000),
        metadata: {
          subscriptionId,
          invoiceId: invoice.id,
          planType: subscription.planType,
          billingInterval: subscription.billingInterval,
        },
      });
    } else {
      // Update existing payment record
      payment.status = 'succeeded';
      payment.completedAt = new Date(invoice.status_transitions.paid_at! * 1000);
    }

    await payment.save();
    console.log('[DBG][stripe-webhook] Payment record updated:', payment._id);
  }

  // Update user's last payment
  const user = await User.findById(subscription.userId);
  if (user) {
    if (!user.billing) {
      user.billing = { paymentHistory: [] };
    }
    user.billing.lastPayment = {
      date: new Date(invoice.created * 1000).toISOString(),
      amount: invoice.amount_paid,
      method: 'Stripe',
      status: 'paid',
      description: `${subscription.planType} plan - ${subscription.billingInterval}`,
      invoice: invoice.hosted_invoice_url || undefined,
    };
    user.billing.nextPayment = {
      date: subscription.nextBillingDate?.toISOString() || '',
      amount: subscription.amount,
      method: 'Stripe',
      status: 'scheduled',
      description: `${subscription.planType} plan - ${subscription.billingInterval}`,
    };
    await user.save();

    // TODO: Add PostHog server-side tracking here
    // posthog.capture({ distinctId: userId, event: 'invoice_payment_succeeded', properties: {...} })
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('[DBG][stripe-webhook] Processing failed payment:', invoice.id);

  if (!(invoice as any).subscription) {
    console.log('[DBG][stripe-webhook] Invoice not related to subscription:', invoice.id);
    return;
  }

  const subscriptionId =
    typeof (invoice as any).subscription === 'string'
      ? (invoice as any).subscription
      : (invoice as any).subscription.id;

  const subscription = await SubscriptionModel.findOne({
    gatewaySubscriptionId: subscriptionId,
  });

  if (!subscription) {
    console.error('[DBG][stripe-webhook] Subscription not found for invoice:', invoice.id);
    return;
  }

  // Update failed payment tracking
  subscription.failedPaymentCount += 1;
  subscription.lastFailedPaymentAt = new Date();
  subscription.status = 'past_due';
  await subscription.save();

  // Update payment record
  const paymentIntentId =
    typeof (invoice as any).payment_intent === 'string'
      ? (invoice as any).payment_intent
      : (invoice as any).payment_intent?.id;

  if (paymentIntentId) {
    let payment = await Payment.findOne({ paymentIntentId });

    if (!payment) {
      payment = new Payment({
        _id: nanoid(),
        userId: subscription.userId,
        itemType: 'subscription',
        itemId: subscription._id,
        amount: invoice.amount_due,
        currency: invoice.currency.toUpperCase(),
        gateway: 'stripe',
        status: 'failed',
        paymentIntentId,
        initiatedAt: new Date(invoice.created * 1000),
        failedAt: new Date(),
        metadata: {
          subscriptionId,
          invoiceId: invoice.id,
          planType: subscription.planType,
          billingInterval: subscription.billingInterval,
          errorMessage: invoice.last_finalization_error?.message,
        },
      });
    } else {
      payment.status = 'failed';
      payment.failedAt = new Date();
    }

    await payment.save();
    console.log('[DBG][stripe-webhook] Failed payment record updated:', payment._id);
  }

  // Update user membership status
  const user = await User.findById(subscription.userId);
  if (user) {
    user.membership.status = 'paused'; // Mark as paused due to payment failure
    await user.save();
    console.log('[DBG][stripe-webhook] User membership paused due to failed payment');
  }

  // TODO: Send notification to user about payment failure
}
