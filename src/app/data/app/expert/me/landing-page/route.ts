import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { getSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ExpertModel from '@/models/Expert';

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

    await connectToDatabase();

    // Find expert by userId
    const expert = await ExpertModel.findOne({ userId }).lean().exec();
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

    // Update landing page configuration
    const updatedExpert = await ExpertModel.findByIdAndUpdate(
      (expert as any)._id,
      {
        customLandingPage: body.customLandingPage,
      },
      {
        new: true,
        lean: true,
      }
    ).exec();

    console.log('[DBG][landing-page/route.ts] ✓ Landing page updated successfully');

    const response: ApiResponse<typeof updatedExpert> = {
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
