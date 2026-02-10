/**
 * GET  /api/data/app/surveys — list all surveys for the tenant
 * POST /api/data/app/surveys — create a new draft survey
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ApiResponse, Survey } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getSurveysByTenant,
  createSurvey,
} from "@/lib/repositories/surveyRepository";

export async function GET() {
  console.log("[DBG][surveys] GET list called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<Survey[]>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<Survey[]>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const surveys = await getSurveysByTenant(tenant.id);
    console.log(`[DBG][surveys] Returning ${surveys.length} surveys`);

    return NextResponse.json<ApiResponse<Survey[]>>({
      success: true,
      data: surveys,
    });
  } catch (error) {
    console.error("[DBG][surveys] GET Error:", error);
    return NextResponse.json<ApiResponse<Survey[]>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch surveys",
      },
      { status: 500 },
    );
  }
}

interface CreateBody {
  title: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  console.log("[DBG][surveys] POST create called");

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

    const body = (await request.json()) as CreateBody;
    if (!body.title?.trim()) {
      return NextResponse.json<ApiResponse<Survey>>(
        { success: false, error: "Missing required field: title" },
        { status: 400 },
      );
    }

    const survey = await createSurvey(tenant.id, {
      expertId: tenant.id,
      title: body.title.trim(),
      description: body.description?.trim(),
    });

    console.log(`[DBG][surveys] Created survey ${survey.id}`);

    return NextResponse.json<ApiResponse<Survey>>(
      { success: true, data: survey },
      { status: 201 },
    );
  } catch (error) {
    console.error("[DBG][surveys] POST Error:", error);
    return NextResponse.json<ApiResponse<Survey>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create survey",
      },
      { status: 500 },
    );
  }
}
