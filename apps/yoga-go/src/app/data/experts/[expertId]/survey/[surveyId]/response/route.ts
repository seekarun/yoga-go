import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import * as surveyRepository from '@/lib/repositories/surveyRepository';
import * as surveyResponseRepository from '@/lib/repositories/surveyResponseRepository';
import { getSession } from '@/lib/auth';

type Params = { expertId: string; surveyId: string };

/**
 * POST /data/experts/[expertId]/survey/[surveyId]/response
 * Submit a response to a specific survey (public endpoint)
 */
export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  const { expertId, surveyId } = await params;
  console.log(
    `[DBG][survey/response/route.ts] POST /data/experts/${expertId}/survey/${surveyId}/response called`
  );

  try {
    // Verify the survey exists and is active
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

    if (survey.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey is not accepting responses',
        },
        { status: 400 }
      );
    }

    // Get user session (if authenticated)
    const session = await getSession();
    const userId = session?.user?.cognitoSub;

    // Parse request body
    const body = await request.json();
    const { contactInfo, answers } = body;

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. answers array is required.',
        },
        { status: 400 }
      );
    }

    // Create survey response using repository
    const surveyResponse = await surveyResponseRepository.createSurveyResponse(expertId, {
      surveyId,
      userId,
      contactInfo,
      answers,
      submittedAt: new Date().toISOString(),
    });

    // Increment response count on the survey
    await surveyRepository.incrementResponseCount(expertId, surveyId);

    console.log(`[DBG][survey/response/route.ts] Created survey response: ${surveyResponse.id}`);

    const response: ApiResponse<{ responseId: string }> = {
      success: true,
      data: { responseId: surveyResponse.id },
      message: 'Survey response submitted successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][survey/response/route.ts] Error submitting survey response:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to submit survey response',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
