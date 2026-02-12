/**
 * GET /api/data/app/subscription/checkout-redirect?tier=professional
 * Authenticated — creates Stripe Customer + Checkout Session, redirects to Stripe
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import {
  getStripePriceId,
  getTrialDays,
  getOrCreateCustomer,
  createSubscriptionCheckout,
} from "@/lib/stripe";
import type { SubscriptionTier } from "@/types/subscription";

const VALID_TIERS: SubscriptionTier[] = ["starter", "professional", "business"];

export async function GET(request: NextRequest) {
  console.log("[DBG][subscription/checkout-redirect] GET called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tier = request.nextUrl.searchParams.get("tier") as SubscriptionTier;
    if (!tier || !VALID_TIERS.includes(tier)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid tier. Must be starter, professional, or business.",
        },
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

    // If already subscribed (active or trialing), redirect to settings
    const subStatus = tenant.subscriptionConfig?.status;
    if (subStatus === "active" || subStatus === "trialing") {
      console.log(
        "[DBG][subscription/checkout-redirect] Tenant already subscribed, redirecting to settings",
      );
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://proj-cally.vercel.app";
      return NextResponse.redirect(
        `${baseUrl}/srv/${tenant.id}/settings/subscription`,
      );
    }

    // Get or create Stripe Customer
    const customer = await getOrCreateCustomer({
      tenantId: tenant.id,
      email: tenant.email,
      name: tenant.name,
      existingCustomerId: tenant.subscriptionConfig?.customerId,
    });

    // Save customer ID early (so we have it even if checkout is abandoned)
    if (!tenant.subscriptionConfig?.customerId) {
      await updateTenant(tenant.id, {
        subscriptionConfig: {
          ...tenant.subscriptionConfig,
          customerId: customer.id,
          subscriptionId: tenant.subscriptionConfig?.subscriptionId ?? "",
          tier,
          status: tenant.subscriptionConfig?.status ?? "incomplete",
          currentPeriodStart:
            tenant.subscriptionConfig?.currentPeriodStart ?? "",
          currentPeriodEnd: tenant.subscriptionConfig?.currentPeriodEnd ?? "",
          cancelAtPeriodEnd:
            tenant.subscriptionConfig?.cancelAtPeriodEnd ?? false,
          subscribedAt:
            tenant.subscriptionConfig?.subscribedAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    }

    const priceId = getStripePriceId(tier);
    const trialDays = getTrialDays(tier);
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://proj-cally.vercel.app";

    const checkoutSession = await createSubscriptionCheckout({
      customerId: customer.id,
      priceId,
      trialDays,
      tenantId: tenant.id,
      tier,
      successUrl: `${baseUrl}/api/data/app/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/srv/${tenant.id}/settings/subscription`,
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { success: false, error: "Failed to create checkout session" },
        { status: 500 },
      );
    }

    console.log(
      "[DBG][subscription/checkout-redirect] Redirecting to Stripe Checkout",
    );
    return NextResponse.redirect(checkoutSession.url);
  } catch (error) {
    console.error("[DBG][subscription/checkout-redirect] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to start subscription checkout" },
      { status: 500 },
    );
  }
}
