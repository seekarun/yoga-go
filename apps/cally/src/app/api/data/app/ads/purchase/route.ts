/**
 * Ad Bundle Purchase API Route (Authenticated)
 * POST /api/data/app/ads/purchase - Create Stripe Checkout for an ad bundle
 */

import { NextResponse } from "next/server";
import type { ApiResponse, AdBundleId } from "@/types";
import { AD_BUNDLES } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { getStripeClient } from "@/lib/stripe";

export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse<{ checkoutUrl: string }>>> {
  console.log("[DBG][ads/purchase] POST called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { bundleId } = body as { bundleId: AdBundleId };

    const bundle = AD_BUNDLES[bundleId];
    if (!bundle) {
      return NextResponse.json(
        { success: false, error: "Invalid bundle" },
        { status: 400 },
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://proj-cally.vercel.app";

    const stripe = getStripeClient();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: bundle.currency,
            unit_amount: bundle.totalAmountCents,
            product_data: {
              name: bundle.name,
              description: `Ad credits: $${(bundle.adSpendCents / 100).toFixed(2)} ad spend + $${(bundle.serviceFeeCents / 100).toFixed(2)} service fee`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tenantId: tenant.id,
        bundleId,
        type: "ad_bundle_purchase",
      },
      success_url: `${baseUrl}/api/data/app/ads/purchase/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/srv/${tenant.id}/ads`,
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { success: false, error: "Failed to create checkout session" },
        { status: 500 },
      );
    }

    console.log(
      `[DBG][ads/purchase] Checkout session created for bundle ${bundleId}`,
    );

    return NextResponse.json({
      success: true,
      data: { checkoutUrl: checkoutSession.url },
    });
  } catch (error) {
    console.error("[DBG][ads/purchase] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create purchase" },
      { status: 500 },
    );
  }
}
