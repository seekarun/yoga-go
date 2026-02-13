/**
 * Ad Bundle Purchase Confirmation
 * GET /api/data/app/ads/purchase/confirm?session_id=...
 * Verifies Stripe payment and credits the ad balance
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { AdBundleId } from "@/types";
import { AD_BUNDLES } from "@/types";
import { getCheckoutSession } from "@/lib/stripe";
import {
  adjustAdCreditBalance,
  createAdTransaction,
} from "@/lib/repositories/adCampaignRepository";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  console.log(`[DBG][ads/purchase/confirm] GET called, session=${sessionId}`);

  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: "Missing session_id" },
      { status: 400 },
    );
  }

  try {
    const checkoutSession = await getCheckoutSession(sessionId);

    if (checkoutSession.payment_status !== "paid") {
      console.log(
        "[DBG][ads/purchase/confirm] Payment not completed, redirecting",
      );
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://proj-cally.vercel.app";
      return NextResponse.redirect(`${baseUrl}/srv/ads?error=payment_failed`);
    }

    const tenantId = checkoutSession.metadata?.tenantId;
    const bundleId = checkoutSession.metadata?.bundleId as AdBundleId;
    const type = checkoutSession.metadata?.type;

    if (!tenantId || !bundleId || type !== "ad_bundle_purchase") {
      console.error(
        "[DBG][ads/purchase/confirm] Invalid metadata:",
        checkoutSession.metadata,
      );
      return NextResponse.json(
        { success: false, error: "Invalid session metadata" },
        { status: 400 },
      );
    }

    const bundle = AD_BUNDLES[bundleId];
    if (!bundle) {
      return NextResponse.json(
        { success: false, error: "Invalid bundle" },
        { status: 400 },
      );
    }

    // Credit the ad balance (only the ad spend portion, not the service fee)
    const newBalance = await adjustAdCreditBalance(
      tenantId,
      bundle.adSpendCents,
      "totalPurchasedCents",
    );

    // Record transaction
    await createAdTransaction(tenantId, {
      type: "purchase",
      amountCents: bundle.adSpendCents,
      balanceAfterCents: newBalance,
      description: `Purchased ${bundle.name}`,
      stripeSessionId: sessionId,
      bundleId,
    });

    console.log(
      `[DBG][ads/purchase/confirm] Credited ${bundle.adSpendCents} to tenant ${tenantId}, new balance: ${newBalance}`,
    );

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://proj-cally.vercel.app";
    return NextResponse.redirect(
      `${baseUrl}/srv/${tenantId}/ads?purchase=success`,
    );
  } catch (error) {
    console.error("[DBG][ads/purchase/confirm] Error:", error);
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://proj-cally.vercel.app";
    return NextResponse.redirect(`${baseUrl}?error=purchase_failed`);
  }
}
