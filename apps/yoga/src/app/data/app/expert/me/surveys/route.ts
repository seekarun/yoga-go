/**
 * Expert Surveys API Routes
 * GET /data/app/expert/me/surveys - List surveys for current expert
 *
 * Supports dual auth: cookies (web) or Bearer token (mobile)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireExpertAuthDual } from '@/lib/auth';
import * as surveyRepository from '@/lib/repositories/surveyRepository';
import type { ApiResponse, Survey } from '@/types';

/**
 * GET /data/app/expert/me/surveys
 * Get all surveys for the current expert (excludes archived)
 */
export async function GET(request: NextRequest) {
  console.log('[DBG][surveys/route.ts] GET /data/app/expert/me/surveys called');

  try {
    // Require expert authentication (supports both cookies and Bearer token)
    const { user, session } = await requireExpertAuthDual(request);
    console.log('[DBG][surveys/route.ts] Authenticated via', session.authType);

    if (!user.expertProfile) {
      console.log('[DBG][surveys/route.ts] Expert profile not found');
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<Survey[]>,
        { status: 404 }
      );
    }

    const expertId = user.expertProfile;

    // Fetch all surveys for this expert from DynamoDB (excludes archived)
    const surveys = await surveyRepository.getSurveysByExpert(expertId);

    console.log('[DBG][surveys/route.ts] Found', surveys.length, 'surveys for expert');

    return NextResponse.json({
      success: true,
      data: surveys,
    } as ApiResponse<Survey[]>);
  } catch (error) {
    console.error('[DBG][surveys/route.ts] Error fetching surveys:', error);

    // Handle auth errors with appropriate status
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch surveys';
    const status =
      errorMessage === 'Unauthorized' ? 401 : errorMessage.includes('Forbidden') ? 403 : 500;

    return NextResponse.json({ success: false, error: errorMessage } as ApiResponse<Survey[]>, {
      status,
    });
  }
}
