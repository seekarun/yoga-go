/**
 * POST /api/data/app/feedback/[feedbackId]/approve — approve feedback for landing page
 * DELETE /api/data/app/feedback/[feedbackId]/approve — revoke approval
 *
 * Body: { createdAt: string } — needed to reconstruct the DynamoDB SK
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  approveFeedback,
  revokeFeedback,
} from "@/lib/repositories/feedbackRepository";

interface RouteParams {
  params: Promise<{
    feedbackId: string;
  }>;
}

interface ApproveBody {
  createdAt: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  console.log("[DBG][feedback/approve] POST called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const { feedbackId } = await params;
    const body = (await request.json()) as ApproveBody;

    if (!body.createdAt) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing required field: createdAt" },
        { status: 400 },
      );
    }

    await approveFeedback(tenant.id, feedbackId, body.createdAt);

    console.log(`[DBG][feedback/approve] Feedback ${feedbackId} approved`);

    return NextResponse.json<ApiResponse<{ approved: boolean }>>({
      success: true,
      data: { approved: true },
    });
  } catch (error) {
    console.error("[DBG][feedback/approve] Error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to approve feedback",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  console.log("[DBG][feedback/approve] DELETE called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const { feedbackId } = await params;
    const body = (await request.json()) as ApproveBody;

    if (!body.createdAt) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing required field: createdAt" },
        { status: 400 },
      );
    }

    await revokeFeedback(tenant.id, feedbackId, body.createdAt);

    console.log(
      `[DBG][feedback/approve] Feedback ${feedbackId} approval revoked`,
    );

    return NextResponse.json<ApiResponse<{ approved: boolean }>>({
      success: true,
      data: { approved: false },
    });
  } catch (error) {
    console.error("[DBG][feedback/approve] Error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to revoke feedback approval",
      },
      { status: 500 },
    );
  }
}
