import { NextResponse } from 'next/server';
import type { ApiResponse, Survey } from '@/types';
import * as surveyRepository from '@/lib/repositories/surveyRepository';

export async function GET(request: Request, { params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = await params;
  console.log(
    `[DBG][experts/[expertId]/survey/route.ts] GET /data/experts/${expertId}/survey called`
  );

  try {
    // Fetch active survey for this expert from DynamoDB
    const survey = await surveyRepository.getActiveSurveyByExpert(expertId);

    if (!survey) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: 'No active survey found for this expert',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    console.log(`[DBG][experts/[expertId]/survey/route.ts] Found survey: ${survey.title}`);

    const response: ApiResponse<Survey> = {
      success: true,
      data: survey,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      `[DBG][experts/[expertId]/survey/route.ts] Error fetching survey for expert ${expertId}:`,
      error
    );
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch survey',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
