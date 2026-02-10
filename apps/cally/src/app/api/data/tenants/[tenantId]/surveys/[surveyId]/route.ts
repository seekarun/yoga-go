/**
 * Public Survey API
 *
 * GET  /api/data/tenants/[tenantId]/surveys/[surveyId]
 *   — return active survey info (title, description, questions) for public rendering
 *
 * POST /api/data/tenants/[tenantId]/surveys/[surveyId]
 *   — submit survey response (answers + optional contactInfo)
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import {
  getSurveyById,
  submitSurveyResponse,
} from "@/lib/repositories/surveyRepository";
import { extractVisitorInfo, checkSpamProtection } from "@core/lib";
import { Tables } from "@/lib/dynamodb";
import type {
  SurveyAnswer,
  SurveyResponseContactInfo,
  SurveyResponseMetadata,
} from "@/types";

interface RouteParams {
  params: Promise<{
    tenantId: string;
    surveyId: string;
  }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId, surveyId } = await params;

    console.log(
      `[DBG][publicSurvey] GET survey ${surveyId} for tenant ${tenantId}`,
    );

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 },
      );
    }

    const survey = await getSurveyById(tenantId, surveyId);
    if (!survey || survey.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Survey not found or not active" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        questions: survey.questions,
        contactInfo: survey.contactInfo,
      },
    });
  } catch (error) {
    console.error("[DBG][publicSurvey] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

interface SubmitBody {
  answers: SurveyAnswer[];
  contactInfo?: SurveyResponseContactInfo;
  _hp?: string;
  _ts?: number;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId, surveyId } = await params;
    const body = (await request.json()) as SubmitBody;

    console.log(
      `[DBG][publicSurvey] POST response for survey ${surveyId} in tenant ${tenantId}`,
    );

    // Spam protection
    const spamCheck = await checkSpamProtection(
      request.headers,
      body as unknown as Record<string, unknown>,
      { tableName: Tables.CORE },
    );
    if (!spamCheck.passed) {
      console.log(`[DBG][publicSurvey] Spam blocked: ${spamCheck.reason}`);
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    if (
      !body.answers ||
      !Array.isArray(body.answers) ||
      body.answers.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required field: answers" },
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

    const survey = await getSurveyById(tenantId, surveyId);
    if (!survey || survey.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Survey not found or not active" },
        { status: 404 },
      );
    }

    // Build metadata from visitor info
    const visitor = extractVisitorInfo(request.headers);
    const metadata: SurveyResponseMetadata = {
      country: visitor.country,
      countryRegion: visitor.region,
      city: visitor.city,
      timezone: visitor.timezone,
      ip: visitor.ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    };

    const response = await submitSurveyResponse(tenantId, surveyId, {
      expertId: survey.expertId,
      answers: body.answers,
      contactInfo: body.contactInfo,
      metadata,
    });

    console.log(
      `[DBG][publicSurvey] Response ${response.id} submitted for survey ${surveyId}`,
    );

    return NextResponse.json({
      success: true,
      data: { responseId: response.id },
    });
  } catch (error) {
    console.error("[DBG][publicSurvey] POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
