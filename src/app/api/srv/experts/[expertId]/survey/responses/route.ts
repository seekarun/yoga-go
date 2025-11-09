import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import SurveyResponse from '@/models/SurveyResponse';
import Survey from '@/models/Survey';
import type { ApiResponse } from '@/types';

interface RouteParams {
  params: Promise<{
    expertId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<any>>> {
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

    // Connect to database
    await connectToDatabase();

    // Get the survey for this expert
    const survey: any = await Survey.findOne({
      expertId,
      isActive: true,
    }).lean();

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

    // Build query
    const query: any = {
      expertId,
      surveyId: survey._id,
    };

    // Apply filters if provided
    if (questionId && answer) {
      query.answers = {
        $elemMatch: {
          questionId,
          answer,
        },
      };
    }

    // Fetch responses
    const responses = await SurveyResponse.find(query).sort({ submittedAt: -1 }).lean();

    console.log(
      `[DBG][survey-responses-api] Found ${responses.length} responses for expert: ${expertId}`
    );

    // Transform responses to include question text
    const enrichedResponses = responses.map((response: any) => {
      const answersWithQuestions = response.answers.map((ans: any) => {
        const question = survey.questions.find((q: any) => q.id === ans.questionId);
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
          id: survey._id,
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
