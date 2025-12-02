import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import * as surveyRepository from '@/lib/repositories/surveyRepository';
import * as surveyResponseRepository from '@/lib/repositories/surveyResponseRepository';
import type { ApiResponse } from '@/types';

interface RouteParams {
  params: Promise<{
    expertId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    console.log('[DBG][survey-responses-api] Fetching survey responses');

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

    const { expertId } = await params;

    // Get the active survey for this expert
    const survey = await surveyRepository.getActiveSurveyByExpert(expertId);

    if (!survey) {
      console.log(`[DBG][survey-responses-api] No active survey found for expert: ${expertId}`);
      return NextResponse.json(
        {
          success: false,
          error: 'No active survey found',
        },
        { status: 404 }
      );
    }

    // Get filter parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const questionId = searchParams.get('questionId');
    const answer = searchParams.get('answer');

    // Fetch responses for this survey
    let responses = await surveyResponseRepository.getResponsesBySurvey(survey.id);

    // Apply filters if provided
    if (questionId && answer) {
      responses = responses.filter(response =>
        response.answers.some(ans => ans.questionId === questionId && ans.answer === answer)
      );
    }

    console.log(
      `[DBG][survey-responses-api] Found ${responses.length} responses for expert: ${expertId}`
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
