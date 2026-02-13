/**
 * PUT  /api/data/app/google-business/reviews/[reviewId]/reply — Reply to a review
 * DELETE /api/data/app/google-business/reviews/[reviewId]/reply — Delete a reply
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import { replyToGBPReview, deleteGBPReviewReply } from "@/lib/google-business";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const { reviewId } = await params;
  console.log("[DBG][google-business/reviews/reply] PUT called for:", reviewId);

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

    const body = await request.json();
    const { comment } = body;

    if (!comment || typeof comment !== "string" || !comment.trim()) {
      return NextResponse.json(
        { success: false, error: "Reply comment is required" },
        { status: 400 },
      );
    }

    const { updatedConfig } = await replyToGBPReview(
      tenant.googleBusinessConfig,
      reviewId,
      comment.trim(),
    );

    // Persist refreshed token if it changed
    if (updatedConfig.accessToken !== tenant.googleBusinessConfig.accessToken) {
      await updateTenant(tenant.id, {
        googleBusinessConfig: updatedConfig,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DBG][google-business/reviews/reply] PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reply to review" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const { reviewId } = await params;
  console.log(
    "[DBG][google-business/reviews/reply] DELETE called for:",
    reviewId,
  );

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

    const { updatedConfig } = await deleteGBPReviewReply(
      tenant.googleBusinessConfig,
      reviewId,
    );

    // Persist refreshed token if it changed
    if (updatedConfig.accessToken !== tenant.googleBusinessConfig.accessToken) {
      await updateTenant(tenant.id, {
        googleBusinessConfig: updatedConfig,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DBG][google-business/reviews/reply] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete review reply" },
      { status: 500 },
    );
  }
}
