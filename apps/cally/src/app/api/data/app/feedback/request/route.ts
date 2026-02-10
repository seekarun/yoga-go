/**
 * POST /api/data/app/feedback/request
 * Authenticated — sends a feedback request email to a user
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { createFeedbackRequest } from "@/lib/repositories/feedbackRepository";
import { sendFeedbackRequestEmail } from "@/lib/email/feedbackRequestEmail";

interface RequestBody {
  email: string;
  name: string;
  customMessage?: string;
}

export async function POST(request: NextRequest) {
  console.log("[DBG][feedback/request] POST called");

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

    const body = (await request.json()) as RequestBody;
    const { email, name, customMessage } = body;

    if (!email || !name) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing required fields: email, name" },
        { status: 400 },
      );
    }

    const token = nanoid(24);

    const feedback = await createFeedbackRequest(tenant.id, {
      recipientEmail: email.toLowerCase().trim(),
      recipientName: name.trim(),
      customMessage: customMessage?.trim() || undefined,
      token,
    });

    // Fire-and-forget email — errors caught internally
    sendFeedbackRequestEmail({
      recipientName: name.trim(),
      recipientEmail: email.toLowerCase().trim(),
      customMessage: customMessage?.trim() || undefined,
      token,
      tenant,
    });

    console.log(
      `[DBG][feedback/request] Feedback request created: ${feedback.id}`,
    );

    return NextResponse.json<
      ApiResponse<{ feedbackId: string; token: string }>
    >({
      success: true,
      data: { feedbackId: feedback.id, token },
    });
  } catch (error) {
    console.error("[DBG][feedback/request] Error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create feedback request",
      },
      { status: 500 },
    );
  }
}
