import { NextResponse } from 'next/server';
import type { ApiResponse, Expert } from '@/types';
import { getSession } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';

export async function PUT(request: Request) {
  console.log('[DBG][landing-page/route.ts] PUT /data/app/expert/me/landing-page called');

  try {
    // Get authenticated user
    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        } as ApiResponse<never>,
        { status: 401 }
      );
    }

    const userId = session.user.cognitoSub;
    console.log('[DBG][landing-page/route.ts] User ID:', userId);

    // Find expert by userId from DynamoDB
    const expert = await expertRepository.getExpertByUserId(userId);
    if (!expert) {
      return NextResponse.json(
        {
          success: false,
          error: 'Expert profile not found',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    console.log('[DBG][landing-page/route.ts] Received data:', body);

    // Update landing page configuration in DynamoDB
    const updatedExpert = await expertRepository.updateLandingPage(
      expert.id,
      body.customLandingPage
    );

    console.log('[DBG][landing-page/route.ts] ✓ Landing page updated successfully');

    const response: ApiResponse<Expert> = {
      success: true,
      data: updatedExpert,
      message: 'Landing page updated successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][landing-page/route.ts] Error updating landing page:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to update landing page',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
