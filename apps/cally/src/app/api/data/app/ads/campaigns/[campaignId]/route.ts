/**
 * Ad Campaign Detail API Routes (Authenticated)
 * GET    /api/data/app/ads/campaigns/[campaignId] - Get campaign details
 * PUT    /api/data/app/ads/campaigns/[campaignId] - Update campaign (draft only)
 * DELETE /api/data/app/ads/campaigns/[campaignId] - Delete campaign (draft only)
 */

import { NextResponse } from "next/server";
import type { ApiResponse, AdCampaign } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getAdCampaignById,
  updateAdCampaign,
  deleteAdCampaign,
} from "@/lib/repositories/adCampaignRepository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
): Promise<NextResponse<ApiResponse<AdCampaign>>> {
  const { campaignId } = await params;
  console.log(`[DBG][ads/campaigns/${campaignId}] GET called`);

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

    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error(`[DBG][ads/campaigns/${campaignId}] GET error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch campaign" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
): Promise<NextResponse<ApiResponse<AdCampaign>>> {
  const { campaignId } = await params;
  console.log(`[DBG][ads/campaigns/${campaignId}] PUT called`);

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

    const existing = await getAdCampaignById(tenant.id, campaignId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    if (existing.status !== "draft") {
      return NextResponse.json(
        { success: false, error: "Only draft campaigns can be edited" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { name, targeting, creative } = body;

    const updated = await updateAdCampaign(tenant.id, campaignId, {
      name: name || existing.name,
      targeting: targeting || existing.targeting,
      creative: creative || existing.creative,
    });

    return NextResponse.json({ success: true, data: updated! });
  } catch (error) {
    console.error(`[DBG][ads/campaigns/${campaignId}] PUT error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to update campaign" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string }> },
): Promise<NextResponse<ApiResponse<null>>> {
  const { campaignId } = await params;
  console.log(`[DBG][ads/campaigns/${campaignId}] DELETE called`);

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

    const existing = await getAdCampaignById(tenant.id, campaignId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    if (existing.status !== "draft" && existing.status !== "failed") {
      return NextResponse.json(
        {
          success: false,
          error: "Only draft or failed campaigns can be deleted",
        },
        { status: 400 },
      );
    }

    await deleteAdCampaign(tenant.id, campaignId);

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error(`[DBG][ads/campaigns/${campaignId}] DELETE error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to delete campaign" },
      { status: 500 },
    );
  }
}
