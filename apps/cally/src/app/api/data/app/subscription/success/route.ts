/**
 * GET /api/data/app/subscription/success?session_id=cs_xxx
 * Authenticated callback from Stripe Checkout — saves subscription config and redirects
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import { getStripeClient } from "@/lib/stripe";
import type {
  SubscriptionTier,
  SubscriptionStatus,
} from "@/types/subscription";

export async function GET(request: NextRequest) {
  console.log("[DBG][subscription/success] GET called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const sessionId = request.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Missing session_id" },
        { status: 400 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Retrieve checkout session from Stripe
    const stripe = getStripeClient();
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const subscription = checkoutSession.subscription;
    if (!subscription || typeof subscription === "string") {
      console.error(
        "[DBG][subscription/success] No expanded subscription on session",
      );
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://proj-cally.vercel.app";
      return NextResponse.redirect(
        `${baseUrl}/srv/${tenant.id}/settings/subscription?subscribed=true`,
      );
    }

    const tier = (checkoutSession.metadata?.tier ||
      "starter") as SubscriptionTier;

    // Get period dates from the first subscription item
    const firstItem = subscription.items.data[0];
    const periodStart = firstItem?.current_period_start ?? 0;
    const periodEnd = firstItem?.current_period_end ?? 0;

    // Save subscription config to tenant
    await updateTenant(tenant.id, {
      subscriptionConfig: {
        customerId:
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id,
        subscriptionId: subscription.id,
        tier,
        status: subscription.status as SubscriptionStatus,
        currentPeriodStart: new Date(periodStart * 1000).toISOString(),
        currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : undefined,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        subscribedAt:
          tenant.subscriptionConfig?.subscribedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    console.log(
      "[DBG][subscription/success] Saved subscription config for tenant:",
      tenant.id,
    );

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://proj-cally.vercel.app";
    return NextResponse.redirect(
      `${baseUrl}/srv/${tenant.id}/settings/subscription?subscribed=true`,
    );
  } catch (error) {
    console.error("[DBG][subscription/success] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process subscription" },
      { status: 500 },
    );
  }
}
