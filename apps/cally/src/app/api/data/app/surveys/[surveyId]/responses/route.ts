/**
 * GET /api/data/app/surveys/[surveyId]/responses
 * Authenticated — list all responses for a survey
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ApiResponse, SurveyResponse } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { getSurveyResponses } from "@/lib/repositories/surveyRepository";

interface RouteParams {
  params: Promise<{ surveyId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  console.log("[DBG][surveys/responses] GET called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<SurveyResponse[]>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<SurveyResponse[]>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const { surveyId } = await params;
    const responses = await getSurveyResponses(tenant.id, surveyId);

    console.log(
      `[DBG][surveys/responses] Returning ${responses.length} responses for survey ${surveyId}`,
    );

    return NextResponse.json<ApiResponse<SurveyResponse[]>>({
      success: true,
      data: responses,
    });
  } catch (error) {
    console.error("[DBG][surveys/responses] Error:", error);
    return NextResponse.json<ApiResponse<SurveyResponse[]>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch survey responses",
      },
      { status: 500 },
    );
  }
}
