import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PAYMENT_CONFIG } from '@/config/payment';
import { connectToDatabase } from '@/lib/mongodb';
import SubscriptionModel from '@/models/Subscription';
import User from '@/models/User';
import Payment from '@/models/Payment';
import { nanoid } from 'nanoid';
import type { PlanType, BillingInterval } from '@/config/payment';

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
      planType,
      billingInterval,
      userId,
      userEmail,
      userName,
      currency,
    }: {
      planType: PlanType;
      billingInterval: BillingInterval;
      userId: string;
      userEmail: string;
      userName: string;
      currency: 'INR' | 'USD';
    } = body;

    console.log('[DBG][stripe-subscription] Creating subscription:', {
      planType,
      billingInterval,
      userId,
      currency,
    });

    // Validate required fields
    if (!planType || !billingInterval || !userId || !userEmail || !currency) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate plan and interval
    if (!['curious', 'committed'].includes(planType)) {
      return NextResponse.json({ success: false, error: 'Invalid plan type' }, { status: 400 });
    }
    if (!['monthly', 'yearly'].includes(billingInterval)) {
      return NextResponse.json(
        { success: false, error: 'Invalid billing interval' },
        { status: 400 }
      );
    }

    const stripe = getStripeInstance();
    await connectToDatabase();

    // Get the appropriate price ID
    const planConfig = PAYMENT_CONFIG.plans[planType][billingInterval];
    const priceId = currency === 'USD' ? planConfig.stripePriceIdUsd : planConfig.stripePriceIdInr;
    const amount = currency === 'USD' ? planConfig.usd : planConfig.inr;

    if (!priceId) {
      return NextResponse.json(
        {
          success: false,
          error: `Stripe price ID not configured for ${planType} ${billingInterval} ${currency}`,
        },
        { status: 500 }
      );
    }

    console.log('[DBG][stripe-subscription] Using price ID:', priceId);

    // Check if user already has a Stripe customer ID
    const user = await User.findById(userId);
    let stripeCustomerId = user?.billing?.stripeCustomerId;

    // Create or retrieve Stripe customer
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: {
          userId,
        },
      });
      stripeCustomerId = customer.id;
      console.log('[DBG][stripe-subscription] Created Stripe customer:', stripeCustomerId);

      // Update user record with Stripe customer ID
      if (user) {
        if (!user.billing) {
          user.billing = {
            paymentHistory: [],
          };
        }
        user.billing.stripeCustomerId = stripeCustomerId;
        await user.save();
      }
    } else {
      console.log('[DBG][stripe-subscription] Using existing Stripe customer:', stripeCustomerId);
    }

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent', 'default_payment_method'],
      metadata: {
        userId,
        planType,
        billingInterval,
      },
    });

    console.log('[DBG][stripe-subscription] Subscription created:', stripeSubscription.id);

    // Calculate period dates
    // @ts-expect-error - Stripe SDK type definition issue
    const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    // @ts-expect-error - Stripe SDK type definition issue
    const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);

    // Store subscription record in database
    const subscriptionId = nanoid();
    const subscriptionDoc = new SubscriptionModel({
      _id: subscriptionId,
      userId,
      planType,
      billingInterval,
      status: 'incomplete', // Will be updated to 'active' via webhook when payment succeeds
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      amount,
      currency: currency.toUpperCase(),
      nextBillingDate: currentPeriodEnd,
      gateway: 'stripe',
      gatewaySubscriptionId: stripeSubscription.id,
      gatewayCustomerId: stripeCustomerId,
      failedPaymentCount: 0,
      metadata: {
        priceId,
      },
    });

    await subscriptionDoc.save();
    console.log('[DBG][stripe-subscription] Subscription record saved:', subscriptionId);

    // Create initial payment record
    const paymentId = nanoid();
    const latestInvoice = stripeSubscription.latest_invoice as Stripe.Invoice;
    // @ts-expect-error - Stripe SDK type definition issue with expanded invoice
    const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent;

    if (paymentIntent) {
      const payment = new Payment({
        _id: paymentId,
        userId,
        itemType: 'subscription',
        itemId: subscriptionId,
        amount,
        currency: currency.toUpperCase(),
        gateway: 'stripe',
        status: 'pending',
        paymentIntentId: paymentIntent.id,
        initiatedAt: new Date(),
        metadata: {
          subscriptionId: stripeSubscription.id,
          planType,
          billingInterval,
          userAgent: request.headers.get('user-agent') || undefined,
        },
      });
      await payment.save();
      console.log('[DBG][stripe-subscription] Payment record saved:', paymentId);
    }

    // Update user membership (will be fully activated via webhook)
    if (user) {
      user.membership.type = planType;
      user.membership.billingInterval = billingInterval;
      user.membership.subscriptionId = subscriptionId;
      user.membership.paymentGateway = 'stripe';
      user.membership.status = 'active'; // Will be confirmed via webhook
      user.membership.currentPeriodEnd = currentPeriodEnd.toISOString();
      await user.save();
      console.log('[DBG][stripe-subscription] User membership updated');
    }

    // Return client secret for payment confirmation
    return NextResponse.json({
      success: true,
      data: {
        subscriptionId: stripeSubscription.id,
        clientSecret: paymentIntent?.client_secret,
        status: stripeSubscription.status,
        subscriptionRecordId: subscriptionId,
      },
    });
  } catch (error) {
    console.error('[DBG][stripe-subscription] Subscription creation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription',
      },
      { status: 500 }
    );
  }
}
