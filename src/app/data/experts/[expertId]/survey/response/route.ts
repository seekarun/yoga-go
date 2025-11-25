import { NextResponse } from 'next/server';
import type { ApiResponse, SurveyResponse } from '@/types';
import { connectToDatabase } from '@/lib/mongodb';
import SurveyResponseModel from '@/models/SurveyResponse';
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
    await connectToDatabase();

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

    // Create survey response
    const responseId = `sr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const surveyResponseDoc = await SurveyResponseModel.create({
      _id: responseId,
      surveyId,
      expertId,
      userId,
      contactInfo,
      answers,
      submittedAt: new Date().toISOString(),
    });

    console.log(
      `[DBG][experts/[expertId]/survey/response/route.ts] Created survey response: ${responseId}`
    );

    const response: ApiResponse<{ responseId: string }> = {
      success: true,
      data: { responseId },
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
