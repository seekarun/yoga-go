/**
 * Regenerate Ad Campaign Creative
 * POST /api/data/app/ads/campaigns/[campaignId]/regenerate
 * AI regenerates creative with optional user feedback
 */

import { NextResponse } from "next/server";
import type { ApiResponse, AdCampaign } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getAdCampaignById,
  updateAdCampaign,
} from "@/lib/repositories/adCampaignRepository";
import { regenerateAdCreative } from "@/lib/ad-campaign-ai";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
): Promise<NextResponse<ApiResponse<AdCampaign>>> {
  const { campaignId } = await params;
  console.log(`[DBG][ads/campaigns/${campaignId}/regenerate] POST called`);

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
        { success: false, error: "Only draft campaigns can be regenerated" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { feedback } = body as { feedback?: string };

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://proj-cally.vercel.app";
    const landingPageUrl = tenant.domainConfig?.domain
      ? `https://${tenant.domainConfig.domain}`
      : `${baseUrl}/${tenant.id}`;

    const aiResult = await regenerateAdCreative(
      {
        goal: campaign.goal,
        platform: campaign.platform,
        bundleId: campaign.bundleId,
        businessName: tenant.name,
        businessDescription:
          tenant.aiAssistantConfig?.businessInfo?.description,
        services: tenant.aiAssistantConfig?.businessInfo?.services,
        location: tenant.aiAssistantConfig?.businessInfo?.location,
        landingPageUrl,
      },
      {
        name: campaign.name,
        targeting: campaign.targeting,
        creative: campaign.creative,
      },
      feedback,
    );

    const updated = await updateAdCampaign(tenant.id, campaignId, {
      name: aiResult.name,
      targeting: aiResult.targeting,
      creative: aiResult.creative,
    });

    console.log(
      `[DBG][ads/campaigns/${campaignId}/regenerate] Creative regenerated`,
    );

    return NextResponse.json({ success: true, data: updated! });
  } catch (error) {
    console.error(
      `[DBG][ads/campaigns/${campaignId}/regenerate] Error:`,
      error,
    );
    return NextResponse.json(
      { success: false, error: "Failed to regenerate creative" },
      { status: 500 },
    );
  }
}
