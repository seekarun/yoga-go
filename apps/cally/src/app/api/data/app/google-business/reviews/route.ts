/**
 * GET /api/data/app/google-business/reviews
 * List Google Reviews for the connected location
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import { listGBPReviews } from "@/lib/google-business";

export async function GET(request: NextRequest) {
  console.log("[DBG][google-business/reviews] GET called");

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

    if (!tenant.googleBusinessConfig) {
      return NextResponse.json(
        { success: false, error: "Google Business Profile is not connected" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get("pageToken") || undefined;

    const {
      reviews,
      averageRating,
      totalReviewCount,
      nextPageToken,
      updatedConfig,
    } = await listGBPReviews(tenant.googleBusinessConfig, pageToken);

    // Persist refreshed token if it changed
    if (updatedConfig.accessToken !== tenant.googleBusinessConfig.accessToken) {
      await updateTenant(tenant.id, {
        googleBusinessConfig: updatedConfig,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        averageRating,
        totalReviewCount,
        nextPageToken,
      },
    });
  } catch (error) {
    console.error("[DBG][google-business/reviews] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reviews" },
      { status: 500 },
    );
  }
}
