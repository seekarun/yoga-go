import { NextResponse } from 'next/server';
import type { ApiResponse, Survey } from '@/types';
import { connectToDatabase } from '@/lib/mongodb';
import SurveyModel from '@/models/Survey';
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

    await connectToDatabase();

    // Fetch active survey for this expert
    const surveyDoc = await SurveyModel.findOne({
      expertId,
      isActive: true,
    })
      .lean()
      .exec();

    if (!surveyDoc) {
      // Return empty survey structure if none exists
      const response: ApiResponse<Survey | null> = {
        success: true,
        data: null,
      };
      return NextResponse.json(response);
    }

    // Transform MongoDB document to Survey type
    const survey: Survey = {
      ...(surveyDoc as any),
      id: (surveyDoc as any)._id as string,
    };

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

    await connectToDatabase();

    // Parse request body
    const body = await request.json();
    const { title, description, contactInfo, questions } = body;

    console.log(`[DBG][srv/experts/[expertId]/survey/route.ts] Updating survey with data:`, body);

    // Check if survey exists
    const existingSurvey = await SurveyModel.findOne({
      expertId,
      isActive: true,
    })
      .lean()
      .exec();

    let survey;

    if (existingSurvey) {
      // Update existing survey
      const updatedSurvey = await SurveyModel.findByIdAndUpdate(
        (existingSurvey as any)._id,
        {
          title,
          description,
          contactInfo,
          questions,
        },
        { new: true, lean: true }
      ).exec();

      survey = {
        ...(updatedSurvey as any),
        id: (updatedSurvey as any)._id as string,
      };

      console.log(
        `[DBG][srv/experts/[expertId]/survey/route.ts] Updated existing survey: ${(existingSurvey as any)._id}`
      );
    } else {
      // Create new survey
      const surveyId = `survey_${expertId}_${Date.now()}`;
      const newSurvey = await SurveyModel.create({
        _id: surveyId,
        expertId,
        title,
        description,
        contactInfo,
        questions,
        isActive: true,
      });

      survey = {
        ...(newSurvey.toObject() as any),
        id: surveyId,
      };

      console.log(`[DBG][srv/experts/[expertId]/survey/route.ts] Created new survey: ${surveyId}`);
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
