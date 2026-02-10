/**
 * POST /api/data/app/feedback/[feedbackId]/remind
 * Authenticated — resend the feedback request email and increment remind count
 *
 * Body: { createdAt: string }
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getFeedbackByTenant,
  remindFeedback,
} from "@/lib/repositories/feedbackRepository";
import { sendFeedbackRequestEmail } from "@/lib/email/feedbackRequestEmail";

interface RouteParams {
  params: Promise<{
    feedbackId: string;
  }>;
}

interface RemindBody {
  createdAt: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  console.log("[DBG][feedback/remind] POST called");

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
    const body = (await request.json()) as RemindBody;

    if (!body.createdAt) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing required field: createdAt" },
        { status: 400 },
      );
    }

    // Find the feedback item to get token and recipient info
    const allFeedback = await getFeedbackByTenant(tenant.id);
    const feedback = allFeedback.find((f) => f.id === feedbackId);

    if (!feedback) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Feedback not found" },
        { status: 404 },
      );
    }

    if (feedback.status !== "pending") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Feedback has already been submitted" },
        { status: 409 },
      );
    }

    // Increment remind count
    await remindFeedback(tenant.id, feedbackId, body.createdAt);

    // Resend the email (fire-and-forget)
    sendFeedbackRequestEmail({
      recipientName: feedback.recipientName,
      recipientEmail: feedback.recipientEmail,
      customMessage: feedback.customMessage,
      token: feedback.token,
      tenant,
    });

    console.log(`[DBG][feedback/remind] Reminder sent for ${feedbackId}`);

    return NextResponse.json<
      ApiResponse<{ reminded: boolean; remindCount: number }>
    >({
      success: true,
      data: {
        reminded: true,
        remindCount: (feedback.remindCount || 0) + 1,
      },
    });
  } catch (error) {
    console.error("[DBG][feedback/remind] Error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to send reminder",
      },
      { status: 500 },
    );
  }
}
