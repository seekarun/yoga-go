import { NextResponse } from 'next/server';
import type { ApiResponse, Survey } from '@/types';
import * as surveyRepository from '@/lib/repositories/surveyRepository';
import { getSession } from '@/lib/auth';

/**
 * GET /api/srv/experts/[expertId]/survey
 * Get all surveys for an expert (excludes archived)
 */
export async function GET(request: Request, { params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = await params;
  console.log(
    `[DBG][srv/experts/[expertId]/survey/route.ts] GET /api/srv/experts/${expertId}/survey called`
  );

  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Fetch all surveys for this expert from DynamoDB (excludes archived)
    const surveys = await surveyRepository.getSurveysByExpert(expertId);

    console.log(
      `[DBG][srv/experts/[expertId]/survey/route.ts] Found ${surveys.length} surveys for expert`
    );

    const response: ApiResponse<Survey[]> = {
      success: true,
      data: surveys,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      `[DBG][srv/experts/[expertId]/survey/route.ts] Error fetching surveys for expert ${expertId}:`,
      error
    );
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch surveys',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/srv/experts/[expertId]/survey
 * Create a new survey (status defaults to 'draft')
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ expertId: string }> }
) {
  const { expertId } = await params;
  console.log(
    `[DBG][srv/experts/[expertId]/survey/route.ts] POST /api/srv/experts/${expertId}/survey called`
  );

  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, description, contactInfo, questions, status } = body;

    console.log(`[DBG][srv/experts/[expertId]/survey/route.ts] Creating survey with data:`, {
      title,
      status: status || 'draft',
    });

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey title is required',
        },
        { status: 400 }
      );
    }

    // Create new survey (expertId is tenantId)
    const survey = await surveyRepository.createSurvey(expertId, {
      title: title.trim(),
      description: description?.trim(),
      contactInfo,
      questions: questions || [],
      status: status || 'draft',
    });

    console.log(
      `[DBG][srv/experts/[expertId]/survey/route.ts] Created new survey: ${survey.id} with status: ${survey.status}`
    );

    const response: ApiResponse<Survey> = {
      success: true,
      data: survey,
      message: 'Survey created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error(
      `[DBG][srv/experts/[expertId]/survey/route.ts] Error creating survey for expert ${expertId}:`,
      error
    );
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to create survey',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
