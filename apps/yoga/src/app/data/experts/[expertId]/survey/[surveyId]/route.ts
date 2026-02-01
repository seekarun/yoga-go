import { NextResponse } from 'next/server';
import type { ApiResponse, Survey } from '@/types';
import * as surveyRepository from '@/lib/repositories/surveyRepository';

type Params = { expertId: string; surveyId: string };

/**
 * GET /data/experts/[expertId]/survey/[surveyId]
 * Get a specific active survey (public endpoint)
 */
export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const { expertId, surveyId } = await params;
  console.log(
    `[DBG][experts/[expertId]/survey/[surveyId]/route.ts] GET /data/experts/${expertId}/survey/${surveyId} called`
  );

  try {
    // Fetch the specific survey
    const survey = await surveyRepository.getSurveyById(expertId, surveyId);

    if (!survey) {
      console.log(
        `[DBG][experts/[expertId]/survey/[surveyId]/route.ts] Survey not found: ${surveyId}`
      );
      const response: ApiResponse<never> = {
        success: false,
        error: 'Survey not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Only return active surveys to the public
    if (survey.status !== 'active') {
      console.log(
        `[DBG][experts/[expertId]/survey/[surveyId]/route.ts] Survey is not active: ${survey.status}`
      );
      const response: ApiResponse<never> = {
        success: false,
        error: 'Survey is not available',
      };
      return NextResponse.json(response, { status: 404 });
    }

    console.log(
      `[DBG][experts/[expertId]/survey/[surveyId]/route.ts] Found survey: ${survey.title}`
    );

    const response: ApiResponse<Survey> = {
      success: true,
      data: survey,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      `[DBG][experts/[expertId]/survey/[surveyId]/route.ts] Error fetching survey ${surveyId}:`,
      error
    );
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch survey',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
