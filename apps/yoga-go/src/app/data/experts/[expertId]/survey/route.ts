import { NextResponse } from 'next/server';
import type { ApiResponse, Survey } from '@/types';
import * as surveyRepository from '@/lib/repositories/surveyRepository';

/**
 * GET /data/experts/[expertId]/survey
 * Get all active surveys for this expert (public endpoint)
 */
export async function GET(request: Request, { params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = await params;
  console.log(
    `[DBG][experts/[expertId]/survey/route.ts] GET /data/experts/${expertId}/survey called`
  );

  try {
    // Fetch all active surveys for this expert from DynamoDB
    const surveys = await surveyRepository.getActiveSurveysByExpert(expertId);

    console.log(`[DBG][experts/[expertId]/survey/route.ts] Found ${surveys.length} active surveys`);

    const response: ApiResponse<Survey[]> = {
      success: true,
      data: surveys,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      `[DBG][experts/[expertId]/survey/route.ts] Error fetching surveys for expert ${expertId}:`,
      error
    );
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch surveys',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
