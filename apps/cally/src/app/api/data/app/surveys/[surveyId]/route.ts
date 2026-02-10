/**
 * GET    /api/data/app/surveys/[surveyId] — get single survey
 * PUT    /api/data/app/surveys/[surveyId] — update survey
 * DELETE /api/data/app/surveys/[surveyId] — delete survey
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type {
  ApiResponse,
  Survey,
  SurveyQuestion,
  SurveyContactInfo,
} from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getSurveyById,
  updateSurvey,
  deleteSurvey,
} from "@/lib/repositories/surveyRepository";

interface RouteParams {
  params: Promise<{ surveyId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  console.log("[DBG][surveys/id] GET called");

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

    const { surveyId } = await params;
    const survey = await getSurveyById(tenant.id, surveyId);
    if (!survey) {
      return NextResponse.json<ApiResponse<Survey>>(
        { success: false, error: "Survey not found" },
        { status: 404 },
      );
    }

    console.log(`[DBG][surveys/id] Returning survey ${surveyId}`);
    return NextResponse.json<ApiResponse<Survey>>({
      success: true,
      data: survey,
    });
  } catch (error) {
    console.error("[DBG][surveys/id] GET Error:", error);
    return NextResponse.json<ApiResponse<Survey>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch survey",
      },
      { status: 500 },
    );
  }
}

interface UpdateBody {
  createdAt: string;
  title?: string;
  description?: string;
  questions?: SurveyQuestion[];
  contactInfo?: SurveyContactInfo;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  console.log("[DBG][surveys/id] PUT called");

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
    const body = (await request.json()) as UpdateBody;

    if (!body.createdAt) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing required field: createdAt" },
        { status: 400 },
      );
    }

    await updateSurvey(tenant.id, surveyId, body.createdAt, {
      title: body.title,
      description: body.description,
      questions: body.questions,
      contactInfo: body.contactInfo,
    });

    console.log(`[DBG][surveys/id] Survey ${surveyId} updated`);
    return NextResponse.json<ApiResponse<{ updated: boolean }>>({
      success: true,
      data: { updated: true },
    });
  } catch (error) {
    console.error("[DBG][surveys/id] PUT Error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update survey",
      },
      { status: 500 },
    );
  }
}

interface DeleteBody {
  createdAt: string;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  console.log("[DBG][surveys/id] DELETE called");

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
    const body = (await request.json()) as DeleteBody;

    if (!body.createdAt) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing required field: createdAt" },
        { status: 400 },
      );
    }

    await deleteSurvey(tenant.id, surveyId, body.createdAt);

    console.log(`[DBG][surveys/id] Survey ${surveyId} deleted`);
    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error("[DBG][surveys/id] DELETE Error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete survey",
      },
      { status: 500 },
    );
  }
}
