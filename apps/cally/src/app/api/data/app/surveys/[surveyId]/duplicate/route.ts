/**
 * POST /api/data/app/surveys/[surveyId]/duplicate — duplicate a survey as a new draft
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ApiResponse, Survey } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { duplicateSurvey } from "@/lib/repositories/surveyRepository";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> },
) {
  const { surveyId } = await params;
  console.log(`[DBG][surveys] POST duplicate called for ${surveyId}`);

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<Survey>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<Survey>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const duplicate = await duplicateSurvey(tenant.id, surveyId, tenant.id);
    if (!duplicate) {
      return NextResponse.json<ApiResponse<Survey>>(
        { success: false, error: "Source survey not found" },
        { status: 404 },
      );
    }

    console.log(
      `[DBG][surveys] Duplicated survey ${surveyId} → ${duplicate.id}`,
    );

    return NextResponse.json<ApiResponse<Survey>>(
      { success: true, data: duplicate },
      { status: 201 },
    );
  } catch (error) {
    console.error("[DBG][surveys] POST duplicate Error:", error);
    return NextResponse.json<ApiResponse<Survey>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to duplicate survey",
      },
      { status: 500 },
    );
  }
}
