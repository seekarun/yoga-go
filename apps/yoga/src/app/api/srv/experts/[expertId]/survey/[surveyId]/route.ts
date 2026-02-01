import { NextResponse } from 'next/server';
import type { ApiResponse, Survey } from '@/types';
import * as surveyRepository from '@/lib/repositories/surveyRepository';
import { getSession } from '@/lib/auth';

type Params = { expertId: string; surveyId: string };

/**
 * GET /api/srv/experts/[expertId]/survey/[surveyId]
 * Get a specific survey by ID
 */
export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const { expertId, surveyId } = await params;
  console.log(
    `[DBG][survey/[surveyId]/route.ts] GET /api/srv/experts/${expertId}/survey/${surveyId} called`
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

    // Fetch survey
    const survey = await surveyRepository.getSurveyById(expertId, surveyId);

    if (!survey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey not found',
        },
        { status: 404 }
      );
    }

    console.log(`[DBG][survey/[surveyId]/route.ts] Found survey: ${survey.title}`);

    const response: ApiResponse<Survey> = {
      success: true,
      data: survey,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][survey/[surveyId]/route.ts] Error fetching survey ${surveyId}:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch survey',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * PUT /api/srv/experts/[expertId]/survey/[surveyId]
 * Update a specific survey
 */
export async function PUT(request: Request, { params }: { params: Promise<Params> }) {
  const { expertId, surveyId } = await params;
  console.log(
    `[DBG][survey/[surveyId]/route.ts] PUT /api/srv/experts/${expertId}/survey/${surveyId} called`
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

    // Check if survey exists
    const existingSurvey = await surveyRepository.getSurveyById(expertId, surveyId);
    if (!existingSurvey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey not found',
        },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, description, contactInfo, questions } = body;

    console.log(`[DBG][survey/[surveyId]/route.ts] Updating survey with data:`, {
      title,
      questionsCount: questions?.length,
    });

    // Validate required fields
    if (title !== undefined && (!title || !title.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey title cannot be empty',
        },
        { status: 400 }
      );
    }

    // Update survey
    const updatedSurvey = await surveyRepository.updateSurvey(expertId, surveyId, {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() }),
      ...(contactInfo !== undefined && { contactInfo }),
      ...(questions !== undefined && { questions }),
    });

    if (!updatedSurvey) {
      throw new Error('Failed to update survey');
    }

    console.log(`[DBG][survey/[surveyId]/route.ts] Updated survey: ${surveyId}`);

    const response: ApiResponse<Survey> = {
      success: true,
      data: updatedSurvey,
      message: 'Survey updated successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][survey/[surveyId]/route.ts] Error updating survey ${surveyId}:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to update survey',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * DELETE /api/srv/experts/[expertId]/survey/[surveyId]
 * Soft delete (archive) a survey
 */
export async function DELETE(request: Request, { params }: { params: Promise<Params> }) {
  const { expertId, surveyId } = await params;
  console.log(
    `[DBG][survey/[surveyId]/route.ts] DELETE /api/srv/experts/${expertId}/survey/${surveyId} called`
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

    // Check if survey exists
    const existingSurvey = await surveyRepository.getSurveyById(expertId, surveyId);
    if (!existingSurvey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey not found',
        },
        { status: 404 }
      );
    }

    // Soft delete (archive) the survey
    const archivedSurvey = await surveyRepository.archiveSurvey(expertId, surveyId);

    if (!archivedSurvey) {
      throw new Error('Failed to archive survey');
    }

    console.log(`[DBG][survey/[surveyId]/route.ts] Archived survey: ${surveyId}`);

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Survey archived successfully' },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][survey/[surveyId]/route.ts] Error archiving survey ${surveyId}:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to delete survey',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
