import { NextResponse } from 'next/server';
import type { ApiResponse, Survey } from '@/types';
import * as surveyRepository from '@/lib/repositories/surveyRepository';
import { getSession } from '@/lib/auth';

type Params = { expertId: string; surveyId: string };

/**
 * PUT /api/srv/experts/[expertId]/survey/[surveyId]/close
 * Close a survey (active -> closed)
 */
export async function PUT(request: Request, { params }: { params: Promise<Params> }) {
  const { expertId, surveyId } = await params;
  console.log(
    `[DBG][survey/close/route.ts] PUT /api/srv/experts/${expertId}/survey/${surveyId}/close called`
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

    // Validate: only active surveys can be closed
    if (existingSurvey.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot close survey with status '${existingSurvey.status}'. Only active surveys can be closed.`,
        },
        { status: 400 }
      );
    }

    // Close the survey
    const closedSurvey = await surveyRepository.closeSurvey(expertId, surveyId);

    if (!closedSurvey) {
      throw new Error('Failed to close survey');
    }

    console.log(`[DBG][survey/close/route.ts] Closed survey: ${surveyId}`);

    const response: ApiResponse<Survey> = {
      success: true,
      data: closedSurvey,
      message: 'Survey closed successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][survey/close/route.ts] Error closing survey ${surveyId}:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to close survey',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
