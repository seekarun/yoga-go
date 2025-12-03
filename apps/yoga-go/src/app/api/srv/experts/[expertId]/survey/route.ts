import { NextResponse } from 'next/server';
import type { ApiResponse, Survey } from '@/types';
import * as surveyRepository from '@/lib/repositories/surveyRepository';
import { getSession } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = await params;
  console.log(
    `[DBG][srv/experts/[expertId]/survey/route.ts] GET /api/srv/experts/${expertId}/survey called`
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

    // Fetch active survey for this expert from DynamoDB
    const survey = await surveyRepository.getActiveSurveyByExpert(expertId);

    if (!survey) {
      // Return empty survey structure if none exists
      const response: ApiResponse<Survey | null> = {
        success: true,
        data: null,
      };
      return NextResponse.json(response);
    }

    console.log(`[DBG][srv/experts/[expertId]/survey/route.ts] Found survey: ${survey.title}`);

    const response: ApiResponse<Survey> = {
      success: true,
      data: survey,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      `[DBG][srv/experts/[expertId]/survey/route.ts] Error fetching survey for expert ${expertId}:`,
      error
    );
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch survey',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = await params;
  console.log(
    `[DBG][srv/experts/[expertId]/survey/route.ts] PUT /api/srv/experts/${expertId}/survey called`
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

    // Parse request body
    const body = await request.json();
    const { title, description, contactInfo, questions } = body;

    console.log(`[DBG][srv/experts/[expertId]/survey/route.ts] Updating survey with data:`, body);

    // Check if survey exists
    const existingSurvey = await surveyRepository.getActiveSurveyByExpert(expertId);

    let survey: Survey;

    if (existingSurvey) {
      // Update existing survey
      const updatedSurvey = await surveyRepository.updateSurvey(expertId, existingSurvey.id, {
        title,
        description,
        contactInfo,
        questions,
      });

      if (!updatedSurvey) {
        throw new Error('Failed to update survey');
      }

      survey = updatedSurvey;
      console.log(
        `[DBG][srv/experts/[expertId]/survey/route.ts] Updated existing survey: ${existingSurvey.id}`
      );
    } else {
      // Create new survey
      survey = await surveyRepository.createSurvey({
        expertId,
        title,
        description,
        contactInfo,
        questions,
        isActive: true,
      });

      console.log(`[DBG][srv/experts/[expertId]/survey/route.ts] Created new survey: ${survey.id}`);
    }

    const response: ApiResponse<Survey> = {
      success: true,
      data: survey,
      message: 'Survey updated successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      `[DBG][srv/experts/[expertId]/survey/route.ts] Error updating survey for expert ${expertId}:`,
      error
    );
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to update survey',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
