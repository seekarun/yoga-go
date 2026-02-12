/**
 * POST /api/stripe/subscription-webhook
 * Public Stripe webhook endpoint — handles subscription lifecycle events
 * Separate from the booking webhook (/api/stripe/webhook) for cleaner separation
 */
import { NextResponse } from "next/server";
import { constructSubscriptionWebhookEvent } from "@/lib/stripe";
import {
  getTenantById,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import type Stripe from "stripe";
import type {
  SubscriptionConfig,
  SubscriptionTier,
  SubscriptionStatus,
} from "@/types/subscription";

export const dynamic = "force-dynamic";

/**
 * Map a Stripe Subscription object to our SubscriptionConfig
 */
function subscriptionToConfig(
  sub: Stripe.Subscription,
  existingConfig?: SubscriptionConfig,
): SubscriptionConfig {
  // Period dates are on subscription items in newer Stripe SDK versions
  const firstItem = sub.items.data[0];
  const periodStart = firstItem?.current_period_start ?? 0;
  const periodEnd = firstItem?.current_period_end ?? 0;

  return {
    customerId:
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    subscriptionId: sub.id,
    tier:
      (sub.metadata.tier as SubscriptionTier) ||
      existingConfig?.tier ||
      "starter",
    status: sub.status as SubscriptionStatus,
    currentPeriodStart: new Date(periodStart * 1000).toISOString(),
    currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
    trialEnd: sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : undefined,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    subscribedAt: existingConfig?.subscribedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Find tenant by Stripe metadata or customer ID
 */
async function findTenantBySubscription(
  sub: Stripe.Subscription,
): Promise<string | null> {
  // Try metadata first
  if (sub.metadata.tenantId) {
    return sub.metadata.tenantId;
  }
  return null;
}

export async function POST(request: Request) {
  console.log("[DBG][subscription-webhook] POST called");

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error(
        "[DBG][subscription-webhook] Missing stripe-signature header",
      );
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 },
      );
    }

    let event: Stripe.Event;
    try {
      event = constructSubscriptionWebhookEvent(body, signature);
    } catch (err) {
      console.error(
        "[DBG][subscription-webhook] Signature verification failed:",
        err,
      );
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 },
      );
    }

    console.log("[DBG][subscription-webhook] Event type:", event.type);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpsert(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(
          "[DBG][subscription-webhook] Trial ending soon for subscription:",
          subscription.id,
        );
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(
          "[DBG][subscription-webhook] Payment failed for invoice:",
          invoice.id,
        );
        break;
      }
      default:
        console.log(
          "[DBG][subscription-webhook] Unhandled event type:",
          event.type,
        );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[DBG][subscription-webhook] Error:", error);
    return NextResponse.json({ received: true });
  }
}

/**
 * Handle subscription created or updated — sync status to tenant
 */
async function handleSubscriptionUpsert(
  subscription: Stripe.Subscription,
): Promise<void> {
  const tenantId = await findTenantBySubscription(subscription);
  if (!tenantId) {
    console.error(
      "[DBG][subscription-webhook] No tenantId in subscription metadata:",
      subscription.id,
    );
    return;
  }

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    console.error("[DBG][subscription-webhook] Tenant not found:", tenantId);
    return;
  }

  const config = subscriptionToConfig(subscription, tenant.subscriptionConfig);
  await updateTenant(tenantId, { subscriptionConfig: config });

  console.log(
    `[DBG][subscription-webhook] Updated subscription for tenant ${tenantId}: status=${config.status} tier=${config.tier}`,
  );
}

/**
 * Handle subscription deleted — mark as canceled
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const tenantId = await findTenantBySubscription(subscription);
  if (!tenantId) {
    console.error(
      "[DBG][subscription-webhook] No tenantId in deleted subscription metadata:",
      subscription.id,
    );
    return;
  }

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    console.error(
      "[DBG][subscription-webhook] Tenant not found for deletion:",
      tenantId,
    );
    return;
  }

  const config = subscriptionToConfig(subscription, tenant.subscriptionConfig);
  config.status = "canceled";
  await updateTenant(tenantId, { subscriptionConfig: config });

  console.log(
    `[DBG][subscription-webhook] Subscription canceled for tenant ${tenantId}`,
  );
}
