/**
 * Resume Ad Campaign
 * POST /api/data/app/ads/campaigns/[campaignId]/resume
 */

import { NextResponse } from "next/server";
import type { ApiResponse, AdCampaign } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getAdCampaignById,
  updateAdCampaign,
} from "@/lib/repositories/adCampaignRepository";
import { updateMetaCampaignStatus } from "@/lib/meta-ads";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
): Promise<NextResponse<ApiResponse<AdCampaign>>> {
  const { campaignId } = await params;
  console.log(`[DBG][ads/campaigns/${campaignId}/resume] POST called`);

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

    if (campaign.status !== "paused") {
      return NextResponse.json(
        { success: false, error: "Only paused campaigns can be resumed" },
        { status: 400 },
      );
    }

    if (campaign.metaCampaignId) {
      await updateMetaCampaignStatus(campaign.metaCampaignId, "ACTIVE");
    }

    const updated = await updateAdCampaign(tenant.id, campaignId, {
      status: "active",
    });

    console.log(`[DBG][ads/campaigns/${campaignId}/resume] Campaign resumed`);

    return NextResponse.json({ success: true, data: updated! });
  } catch (error) {
    console.error(`[DBG][ads/campaigns/${campaignId}/resume] Error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to resume campaign" },
      { status: 500 },
    );
  }
}
