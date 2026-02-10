/**
 * Public Feedback API
 *
 * GET /api/data/tenants/[tenantId]/feedback?token=xxx
 *   — validate token and return request info for the feedback form
 *
 * POST /api/data/tenants/[tenantId]/feedback
 *   — submit feedback (rating, message, consent)
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import {
  getFeedbackByToken,
  submitFeedback,
} from "@/lib/repositories/feedbackRepository";
import { checkSpamProtection } from "@core/lib";
import { Tables } from "@/lib/dynamodb";

interface RouteParams {
  params: Promise<{
    tenantId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await params;
    const token = request.nextUrl.searchParams.get("token");

    console.log(
      `[DBG][tenantFeedback] GET called for tenant ${tenantId}, token: ${token ? "present" : "missing"}`,
    );

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing token" },
        { status: 400 },
      );
    }

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 },
      );
    }

    const feedback = await getFeedbackByToken(tenantId, token);
    if (!feedback) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired feedback link" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        recipientName: feedback.recipientName,
        status: feedback.status,
        tenantName: tenant.name,
      },
    });
  } catch (error) {
    console.error("[DBG][tenantFeedback] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

interface SubmitBody {
  token: string;
  rating: number;
  message: string;
  consentToShowcase: boolean;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await params;
    const body = (await request.json()) as SubmitBody;

    console.log(`[DBG][tenantFeedback] POST called for tenant ${tenantId}`);

    // Spam protection
    const spamCheck = await checkSpamProtection(
      request.headers,
      body as unknown as Record<string, unknown>,
      { tableName: Tables.CORE },
    );
    if (!spamCheck.passed) {
      console.log(`[DBG][tenantFeedback] Spam blocked: ${spamCheck.reason}`);
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const { token, rating, message, consentToShowcase } = body;

    if (!token || !rating || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: token, rating, message",
        },
        { status: 400 },
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "Rating must be between 1 and 5" },
        { status: 400 },
      );
    }

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 },
      );
    }

    const feedback = await getFeedbackByToken(tenantId, token);
    if (!feedback) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired feedback link" },
        { status: 404 },
      );
    }

    if (feedback.status === "submitted") {
      return NextResponse.json(
        { success: false, error: "Feedback has already been submitted" },
        { status: 409 },
      );
    }

    await submitFeedback(tenantId, feedback.id, feedback.createdAt, {
      rating,
      message: message.trim(),
      consentToShowcase: !!consentToShowcase,
    });

    console.log(
      `[DBG][tenantFeedback] Feedback ${feedback.id} submitted successfully`,
    );

    return NextResponse.json({
      success: true,
      data: { submitted: true },
    });
  } catch (error) {
    console.error("[DBG][tenantFeedback] POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
