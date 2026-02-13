/**
 * Ad Campaign API Routes (Authenticated)
 * GET  /api/data/app/ads/campaigns - List all campaigns for the tenant
 * POST /api/data/app/ads/campaigns - Create a new campaign (triggers AI generation)
 */

import { NextResponse } from "next/server";
import type {
  ApiResponse,
  AdCampaign,
  AdBundleId,
  AdGoal,
  AdPlatform,
} from "@/types";
import { AD_BUNDLES } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getAdCampaignsByTenant,
  createAdCampaign,
} from "@/lib/repositories/adCampaignRepository";
import { generateAdCampaign } from "@/lib/ad-campaign-ai";

export async function GET(): Promise<NextResponse<ApiResponse<AdCampaign[]>>> {
  console.log("[DBG][ads/campaigns] GET called");

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

    const campaigns = await getAdCampaignsByTenant(tenant.id);

    console.log(
      `[DBG][ads/campaigns] Returning ${campaigns.length} campaigns for tenant ${tenant.id}`,
    );

    return NextResponse.json({ success: true, data: campaigns });
  } catch (error) {
    console.error("[DBG][ads/campaigns] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch campaigns" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse<AdCampaign>>> {
  console.log("[DBG][ads/campaigns] POST called");

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
    const { goal, platform, bundleId } = body as {
      goal: AdGoal;
      platform: AdPlatform;
      bundleId: AdBundleId;
    };

    // Validate
    if (!goal || !["traffic", "lead_generation"].includes(goal)) {
      return NextResponse.json(
        { success: false, error: "Invalid goal" },
        { status: 400 },
      );
    }
    if (!platform || !["facebook", "instagram", "both"].includes(platform)) {
      return NextResponse.json(
        { success: false, error: "Invalid platform" },
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

    // Build landing page URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://proj-cally.vercel.app";
    const landingPageUrl = tenant.domainConfig?.domain
      ? `https://${tenant.domainConfig.domain}`
      : `${baseUrl}/${tenant.id}`;

    // AI generates campaign
    const aiResult = await generateAdCampaign({
      goal,
      platform,
      bundleId,
      businessName: tenant.name,
      businessDescription: tenant.aiAssistantConfig?.businessInfo?.description,
      services: tenant.aiAssistantConfig?.businessInfo?.services,
      location: tenant.aiAssistantConfig?.businessInfo?.location,
      landingPageUrl,
    });

    const campaign = await createAdCampaign(tenant.id, {
      name: aiResult.name,
      tenantId: tenant.id,
      goal,
      platform,
      bundleId,
      budgetCents: bundle.adSpendCents,
      targeting: aiResult.targeting,
      creative: aiResult.creative,
    });

    console.log(
      `[DBG][ads/campaigns] Created campaign ${campaign.id} for tenant ${tenant.id}`,
    );

    return NextResponse.json(
      { success: true, data: campaign },
      { status: 201 },
    );
  } catch (error) {
    console.error("[DBG][ads/campaigns] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create campaign" },
      { status: 500 },
    );
  }
}
