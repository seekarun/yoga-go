import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import * as surveyRepository from '@/lib/repositories/surveyRepository';
import * as surveyResponseRepository from '@/lib/repositories/surveyResponseRepository';
import type { ApiResponse } from '@/types';

type Params = { expertId: string; surveyId: string };

/**
 * GET /api/srv/experts/[expertId]/survey/[surveyId]/responses
 * Get all responses for a specific survey
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse<ApiResponse<unknown>>> {
  const { expertId, surveyId } = await params;

  try {
    console.log(`[DBG][survey-responses-api] Fetching responses for survey: ${surveyId}`);

    // Check authentication
    const session = await getSession();
    if (!session?.user) {
      console.log('[DBG][survey-responses-api] Unauthorized access attempt');
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Get the survey
    const survey = await surveyRepository.getSurveyById(expertId, surveyId);

    if (!survey) {
      console.log(`[DBG][survey-responses-api] Survey not found: ${surveyId}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Survey not found',
        },
        { status: 404 }
      );
    }

    // Get filter parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const questionId = searchParams.get('questionId');
    const answer = searchParams.get('answer');

    // Fetch responses for this survey (expertId is tenantId)
    let responses = await surveyResponseRepository.getResponsesBySurvey(expertId, surveyId);

    // Apply filters if provided
    if (questionId && answer) {
      responses = responses.filter(response =>
        response.answers.some(ans => ans.questionId === questionId && ans.answer === answer)
      );
    }

    console.log(
      `[DBG][survey-responses-api] Found ${responses.length} responses for survey: ${surveyId}`
    );

    // Transform responses to include question text
    const enrichedResponses = responses.map(response => {
      const answersWithQuestions = response.answers.map(ans => {
        const question = survey.questions.find(q => q.id === ans.questionId);
        return {
          ...ans,
          questionText: question?.questionText || 'Unknown Question',
          questionType: question?.type || 'text',
        };
      });

      return {
        ...response,
        answers: answersWithQuestions,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        survey: {
          id: survey.id,
          title: survey.title,
          description: survey.description,
          questions: survey.questions,
          status: survey.status,
        },
        responses: enrichedResponses,
        total: enrichedResponses.length,
      },
    });
  } catch (error) {
    console.error('[DBG][survey-responses-api] Error fetching survey responses:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
