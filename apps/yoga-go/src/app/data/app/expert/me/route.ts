import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { ApiResponse, Expert } from '@/types';
import { requireExpertAuthDual } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';

/**
 * GET /data/app/expert/me
 * Get current user's expert profile
 *
 * Supports dual auth: cookies (web) or Bearer token (mobile)
 */
export async function GET(request: NextRequest) {
  console.log('[DBG][expert/me/route.ts] GET /data/app/expert/me called');

  try {
    // Require expert authentication (supports both cookies and Bearer token)
    const { user, session } = await requireExpertAuthDual(request);
    console.log('[DBG][expert/me/route.ts] Authenticated via', session.authType);

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

    // Handle auth errors with appropriate status
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch expert profile';
    const status =
      errorMessage === 'Unauthorized' ? 401 : errorMessage.includes('Forbidden') ? 403 : 500;

    return NextResponse.json({ success: false, error: errorMessage } as ApiResponse<Expert>, {
      status,
    });
  }
}

/**
 * PATCH /data/app/expert/me
 * Update current user's expert profile
 *
 * Supports dual auth: cookies (web) or Bearer token (mobile)
 */
export async function PATCH(request: NextRequest) {
  console.log('[DBG][expert/me/route.ts] PATCH /data/app/expert/me called');

  try {
    // Require expert authentication (supports both cookies and Bearer token)
    const { user, session } = await requireExpertAuthDual(request);
    console.log('[DBG][expert/me/route.ts] Authenticated via', session.authType);

    const updates = await request.json();
    console.log('[DBG][expert/me/route.ts] Received updates:', Object.keys(updates));

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

    // Handle auth errors with appropriate status
    const errorMessage = error instanceof Error ? error.message : 'Failed to update expert profile';
    const status =
      errorMessage === 'Unauthorized' ? 401 : errorMessage.includes('Forbidden') ? 403 : 500;

    return NextResponse.json({ success: false, error: errorMessage } as ApiResponse<Expert>, {
      status,
    });
  }
}
