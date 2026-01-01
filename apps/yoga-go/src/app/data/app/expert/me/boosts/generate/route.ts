import { NextResponse } from 'next/server';
import type { ApiResponse, BoostGoal, BoostTargeting, BoostCreative } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
import { generateCampaignFromExpert } from '@/lib/boost-ai';

interface GenerateResponse {
  targeting: BoostTargeting;
  creative: BoostCreative;
  alternativeCreatives: BoostCreative[];
  reasoning: string;
}

/**
 * POST /data/app/expert/me/boosts/generate
 * Generate AI-powered campaign targeting and creatives
 * Body: { goal, courseId?, budget, currency }
 */
export async function POST(request: Request) {
  console.log('[DBG][boosts/generate/route.ts] POST called');

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse<GenerateResponse>,
        { status: 401 }
      );
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' } as ApiResponse<GenerateResponse>,
        { status: 404 }
      );
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<GenerateResponse>,
        { status: 403 }
      );
    }

    const expertId = user.expertProfile;

    // Parse request body
    const body = await request.json();
    const { goal, courseId, budget, currency = 'USD' } = body;

    // Validate required fields
    if (!goal || !budget) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: goal and budget are required',
        } as ApiResponse<GenerateResponse>,
        { status: 400 }
      );
    }

    // Validate goal
    const validGoals: BoostGoal[] = ['get_students', 'promote_course', 'brand_awareness'];
    if (!validGoals.includes(goal)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid goal. Must be: get_students, promote_course, or brand_awareness',
        } as ApiResponse<GenerateResponse>,
        { status: 400 }
      );
    }

    // Get expert profile
    const expert = await expertRepository.getExpertById(expertId);
    if (!expert) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<GenerateResponse>,
        { status: 404 }
      );
    }

    // Get course if specified (cross-tenant lookup)
    let course = null;
    if (courseId) {
      course = await courseRepository.getCourseByIdOnly(courseId);
      if (!course) {
        return NextResponse.json(
          { success: false, error: 'Course not found' } as ApiResponse<GenerateResponse>,
          { status: 404 }
        );
      }
      // Verify course belongs to expert
      if (course.instructor.id !== expertId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Course does not belong to this expert',
          } as ApiResponse<GenerateResponse>,
          { status: 403 }
        );
      }
    }

    console.log('[DBG][boosts/generate/route.ts] Generating campaign for:', goal);

    // Generate campaign with AI
    const result = await generateCampaignFromExpert(expert, course, goal, budget, currency);

    console.log('[DBG][boosts/generate/route.ts] Campaign generated successfully');

    return NextResponse.json({
      success: true,
      data: {
        targeting: result.targeting,
        creative: result.creative,
        alternativeCreatives: result.alternativeCreatives,
        reasoning: result.reasoning,
      },
    } as ApiResponse<GenerateResponse>);
  } catch (error) {
    console.error('[DBG][boosts/generate/route.ts] Error generating campaign:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate campaign',
      } as ApiResponse<GenerateResponse>,
      { status: 500 }
    );
  }
}
