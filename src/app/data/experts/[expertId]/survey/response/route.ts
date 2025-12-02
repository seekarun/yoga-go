import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import * as surveyResponseRepository from '@/lib/repositories/surveyResponseRepository';
import { getSession } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ expertId: string }> }
) {
  const { expertId } = await params;
  console.log(
    `[DBG][experts/[expertId]/survey/response/route.ts] POST /data/experts/${expertId}/survey/response called`
  );

  try {
    // Get user session (if authenticated)
    const session = await getSession();
    const userId = session?.user?.cognitoSub;

    // Parse request body
    const body = await request.json();
    const { surveyId, contactInfo, answers } = body;

    if (!surveyId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. surveyId and answers are required.',
        },
        { status: 400 }
      );
    }

    // Create survey response using repository
    const surveyResponse = await surveyResponseRepository.createSurveyResponse({
      surveyId,
      expertId,
      userId,
      contactInfo,
      answers,
      submittedAt: new Date().toISOString(),
    });

    console.log(
      `[DBG][experts/[expertId]/survey/response/route.ts] Created survey response: ${surveyResponse.id}`
    );

    const response: ApiResponse<{ responseId: string }> = {
      success: true,
      data: { responseId: surveyResponse.id },
      message: 'Survey response submitted successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      `[DBG][experts/[expertId]/survey/response/route.ts] Error submitting survey response:`,
      error
    );
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to submit survey response',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
