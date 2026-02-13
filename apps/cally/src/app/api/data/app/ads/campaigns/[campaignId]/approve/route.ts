/**
 * Approve Ad Campaign
 * POST /api/data/app/ads/campaigns/[campaignId]/approve
 * Deducts balance, submits to Meta, sets campaign to active
 */

import { NextResponse } from "next/server";
import type { ApiResponse, AdCampaign } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getAdCampaignById,
  updateAdCampaign,
  getAdCredit,
  adjustAdCreditBalance,
  createAdTransaction,
} from "@/lib/repositories/adCampaignRepository";
import { submitCampaignToMeta } from "@/lib/meta-ads";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
): Promise<NextResponse<ApiResponse<AdCampaign>>> {
  const { campaignId } = await params;
  console.log(`[DBG][ads/campaigns/${campaignId}/approve] POST called`);

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

    const campaign = await getAdCampaignById(tenant.id, campaignId);
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    if (campaign.status !== "draft") {
      return NextResponse.json(
        { success: false, error: "Only draft campaigns can be approved" },
        { status: 400 },
      );
    }

    // Check balance
    const credit = await getAdCredit(tenant.id);
    const balance = credit?.balanceCents ?? 0;

    if (balance < campaign.budgetCents) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient balance. Need $${(campaign.budgetCents / 100).toFixed(2)}, have $${(balance / 100).toFixed(2)}`,
        },
        { status: 400 },
      );
    }

    // Mark as submitting
    await updateAdCampaign(tenant.id, campaignId, { status: "submitting" });

    // Build landing page URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://proj-cally.vercel.app";
    const landingPageUrl = tenant.domainConfig?.domain
      ? `https://${tenant.domainConfig.domain}`
      : `${baseUrl}/${tenant.id}`;

    try {
      // Submit to Meta
      const metaIds = await submitCampaignToMeta(campaign, landingPageUrl);

      // Deduct balance
      const newBalance = await adjustAdCreditBalance(
        tenant.id,
        -campaign.budgetCents,
        "totalSpentCents",
      );

      // Record transaction
      await createAdTransaction(tenant.id, {
        type: "spend",
        amountCents: campaign.budgetCents,
        balanceAfterCents: newBalance,
        description: `Ad campaign: ${campaign.name}`,
        campaignId: campaign.id,
      });

      // Update campaign with Meta IDs and active status
      const updated = await updateAdCampaign(tenant.id, campaignId, {
        status: "active",
        metaCampaignId: metaIds.metaCampaignId,
        metaAdSetId: metaIds.metaAdSetId,
        metaAdId: metaIds.metaAdId,
        metaCreativeId: metaIds.metaCreativeId,
        metaLeadFormId: metaIds.metaLeadFormId,
        approvedAt: new Date().toISOString(),
      });

      console.log(
        `[DBG][ads/campaigns/${campaignId}/approve] Campaign approved and submitted`,
      );

      return NextResponse.json({ success: true, data: updated! });
    } catch (metaError) {
      // Submission failed — mark campaign as failed
      console.error(
        `[DBG][ads/campaigns/${campaignId}/approve] Meta submission failed:`,
        metaError,
      );

      const failedCampaign = await updateAdCampaign(tenant.id, campaignId, {
        status: "failed",
        failureReason:
          metaError instanceof Error ? metaError.message : "Unknown error",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Failed to submit campaign to Meta",
          data: failedCampaign!,
        } as ApiResponse<AdCampaign>,
        { status: 500 },
      );
    }
  } catch (error) {
    console.error(`[DBG][ads/campaigns/${campaignId}/approve] Error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to approve campaign" },
      { status: 500 },
    );
  }
}
