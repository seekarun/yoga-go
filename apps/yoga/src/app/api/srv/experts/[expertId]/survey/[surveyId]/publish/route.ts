import { NextResponse } from 'next/server';
import type { ApiResponse, Survey } from '@/types';
import * as surveyRepository from '@/lib/repositories/surveyRepository';
import { getSession } from '@/lib/auth';

type Params = { expertId: string; surveyId: string };

/**
 * PUT /api/srv/experts/[expertId]/survey/[surveyId]/publish
 * Publish a survey (draft -> active)
 */
export async function PUT(request: Request, { params }: { params: Promise<Params> }) {
  const { expertId, surveyId } = await params;
  console.log(
    `[DBG][survey/publish/route.ts] PUT /api/srv/experts/${expertId}/survey/${surveyId}/publish called`
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

    // Validate: only draft surveys can be published
    if (existingSurvey.status !== 'draft') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot publish survey with status '${existingSurvey.status}'. Only draft surveys can be published.`,
        },
        { status: 400 }
      );
    }

    // Validate: survey must have at least one question
    if (!existingSurvey.questions || existingSurvey.questions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot publish survey without questions. Add at least one question first.',
        },
        { status: 400 }
      );
    }

    // Publish the survey
    const publishedSurvey = await surveyRepository.publishSurvey(expertId, surveyId);

    if (!publishedSurvey) {
      throw new Error('Failed to publish survey');
    }

    console.log(`[DBG][survey/publish/route.ts] Published survey: ${surveyId}`);

    const response: ApiResponse<Survey> = {
      success: true,
      data: publishedSurvey,
      message: 'Survey published successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][survey/publish/route.ts] Error publishing survey ${surveyId}:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to publish survey',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
