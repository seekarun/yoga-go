import { NextResponse } from 'next/server';
import type { ApiResponse, Expert } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';

/**
 * GET /data/app/expert/me
 * Get current user's expert profile
 *
 * Uses getSessionFromCookies() for Vercel compatibility
 */
export async function GET() {
  console.log('[DBG][expert/me/route.ts] GET /data/app/expert/me called');

  try {
    // Require authentication - use cookie-based session for Vercel
    const session = await getSessionFromCookies();
    if (!session || !session.user || !session.user.cognitoSub) {
      console.log('[DBG][expert/me/route.ts] Unauthorized - no session');
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<Expert>, {
        status: 401,
      });
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);

    if (!user) {
      console.log('[DBG][expert/me/route.ts] User not found');
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<Expert>, {
        status: 404,
      });
    }

    // Check if user is an expert (role is now an array)
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert) {
      console.log('[DBG][expert/me/route.ts] User is not an expert');
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<Expert>,
        { status: 403 }
      );
    }

    // Get expert profile if it exists
    if (!user.expertProfile) {
      console.log('[DBG][expert/me/route.ts] Expert profile not created yet');
      return NextResponse.json({
        success: true,
        message: 'Expert profile not created yet',
      } as ApiResponse<Expert>);
    }

    // Get expert from DynamoDB
    const expert = await expertRepository.getExpertById(user.expertProfile);

    if (!expert) {
      console.log('[DBG][expert/me/route.ts] Expert profile not found');
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<Expert>,
        { status: 404 }
      );
    }

    console.log('[DBG][expert/me/route.ts] Expert profile found:', expert.id, 'name:', expert.name);
    return NextResponse.json({ success: true, data: expert } as ApiResponse<Expert>);
  } catch (error) {
    console.error('[DBG][expert/me/route.ts] Error fetching expert profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch expert profile',
      } as ApiResponse<Expert>,
      { status: 500 }
    );
  }
}

/**
 * PATCH /data/app/expert/me
 * Update current user's expert profile
 *
 * Uses getSessionFromCookies() for Vercel compatibility
 */
export async function PATCH(request: Request) {
  console.log('[DBG][expert/me/route.ts] PATCH /data/app/expert/me called');

  try {
    // Require authentication - use cookie-based session for Vercel
    const session = await getSessionFromCookies();
    if (!session || !session.user || !session.user.cognitoSub) {
      console.log('[DBG][expert/me/route.ts] Unauthorized - no session');
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<Expert>, {
        status: 401,
      });
    }

    const updates = await request.json();
    console.log('[DBG][expert/me/route.ts] Received updates:', Object.keys(updates));

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);

    if (!user) {
      console.log('[DBG][expert/me/route.ts] User not found');
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<Expert>, {
        status: 404,
      });
    }

    // Check if user is an expert (role is now an array)
    const isExpertPatch = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpertPatch) {
      console.log('[DBG][expert/me/route.ts] User is not an expert');
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<Expert>,
        { status: 403 }
      );
    }

    if (!user.expertProfile) {
      console.log('[DBG][expert/me/route.ts] Expert profile not found');
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<Expert>,
        { status: 404 }
      );
    }

    // Remove fields that shouldn't be updated directly
    const {
      id: _id,
      userId: _userId,
      totalCourses: _totalCourses,
      totalStudents: _totalStudents,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...allowedUpdates
    } = updates;

    // Update expert profile in DynamoDB
    const expert = await expertRepository.updateExpert(user.expertProfile, allowedUpdates);

    console.log('[DBG][expert/me/route.ts] Expert profile updated:', expert.id);
    return NextResponse.json({
      success: true,
      data: expert,
      message: 'Expert profile updated successfully',
    } as ApiResponse<Expert>);
  } catch (error) {
    console.error('[DBG][expert/me/route.ts] Error updating expert profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update expert profile',
      } as ApiResponse<Expert>,
      { status: 500 }
    );
  }
}
