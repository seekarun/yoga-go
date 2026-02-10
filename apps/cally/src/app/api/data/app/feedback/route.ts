/**
 * GET /api/data/app/feedback
 * Authenticated — list all feedback for the tenant (newest first)
 */

import { NextResponse } from "next/server";
import type { ApiResponse, FeedbackRequest } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { getFeedbackByTenant } from "@/lib/repositories/feedbackRepository";

export async function GET() {
  console.log("[DBG][feedback] GET called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<FeedbackRequest[]>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<FeedbackRequest[]>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const feedback = await getFeedbackByTenant(tenant.id);

    console.log(`[DBG][feedback] Returning ${feedback.length} feedback items`);

    return NextResponse.json<ApiResponse<FeedbackRequest[]>>({
      success: true,
      data: feedback,
    });
  } catch (error) {
    console.error("[DBG][feedback] Error:", error);
    return NextResponse.json<ApiResponse<FeedbackRequest[]>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch feedback",
      },
      { status: 500 },
    );
  }
}
