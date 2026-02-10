/**
 * POST /api/data/app/surveys/[surveyId]/status
 * Body: { status: "active" | "closed" | "archived", createdAt: string }
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ApiResponse, SurveyStatus } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { updateSurveyStatus } from "@/lib/repositories/surveyRepository";

interface RouteParams {
  params: Promise<{ surveyId: string }>;
}

interface StatusBody {
  status: SurveyStatus;
  createdAt: string;
}

const VALID_STATUSES: SurveyStatus[] = ["active", "closed", "archived"];

export async function POST(request: NextRequest, { params }: RouteParams) {
  console.log("[DBG][surveys/status] POST called");

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

    const { surveyId } = await params;
    const body = (await request.json()) as StatusBody;

    if (!body.createdAt) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing required field: createdAt" },
        { status: 400 },
      );
    }

    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    await updateSurveyStatus(tenant.id, surveyId, body.createdAt, body.status);

    console.log(
      `[DBG][surveys/status] Survey ${surveyId} status → ${body.status}`,
    );
    return NextResponse.json<ApiResponse<{ status: SurveyStatus }>>({
      success: true,
      data: { status: body.status },
    });
  } catch (error) {
    console.error("[DBG][surveys/status] Error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update survey status",
      },
      { status: 500 },
    );
  }
}
