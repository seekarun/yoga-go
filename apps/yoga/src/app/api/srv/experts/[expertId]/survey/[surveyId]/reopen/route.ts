import { NextResponse } from 'next/server';
import type { ApiResponse, Survey } from '@/types';
import * as surveyRepository from '@/lib/repositories/surveyRepository';
import { getSession } from '@/lib/auth';

type Params = { expertId: string; surveyId: string };

/**
 * PUT /api/srv/experts/[expertId]/survey/[surveyId]/reopen
 * Reopen a survey (closed -> active)
 */
export async function PUT(request: Request, { params }: { params: Promise<Params> }) {
  const { expertId, surveyId } = await params;
  console.log(
    `[DBG][survey/reopen/route.ts] PUT /api/srv/experts/${expertId}/survey/${surveyId}/reopen called`
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

    // Validate: only closed surveys can be reopened
    if (existingSurvey.status !== 'closed') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot reopen survey with status '${existingSurvey.status}'. Only closed surveys can be reopened.`,
        },
        { status: 400 }
      );
    }

    // Reopen the survey
    const reopenedSurvey = await surveyRepository.reopenSurvey(expertId, surveyId);

    if (!reopenedSurvey) {
      throw new Error('Failed to reopen survey');
    }

    console.log(`[DBG][survey/reopen/route.ts] Reopened survey: ${surveyId}`);

    const response: ApiResponse<Survey> = {
      success: true,
      data: reopenedSurvey,
      message: 'Survey reopened successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][survey/reopen/route.ts] Error reopening survey ${surveyId}:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to reopen survey',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
