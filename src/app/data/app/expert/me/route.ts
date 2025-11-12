import { NextResponse } from 'next/server';
import type { ApiResponse, Expert } from '@/types';
import { getSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ExpertModel from '@/models/Expert';
import UserModel from '@/models/User';

/**
 * GET /data/app/expert/me
 * Get current user's expert profile
 */
export async function GET() {
  console.log('[DBG][expert/me/route.ts] GET /data/app/expert/me called');

  try {
    // Require authentication
    const session = await getSession();
    if (!session || !session.user) {
      console.log('[DBG][expert/me/route.ts] Unauthorized - no session');
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<Expert>, {
        status: 401,
      });
    }

    await connectToDatabase();

    // Get user to check role and expert profile
    const userDoc = await UserModel.findOne({ auth0Id: session.user.sub }).exec();

    if (!userDoc) {
      console.log('[DBG][expert/me/route.ts] User not found');
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<Expert>, {
        status: 404,
      });
    }

    // Check if user is an expert
    if (userDoc.role !== 'expert') {
      console.log('[DBG][expert/me/route.ts] User is not an expert');
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<Expert>,
        { status: 403 }
      );
    }

    // Get expert profile if it exists
    if (!userDoc.expertProfile) {
      console.log('[DBG][expert/me/route.ts] Expert profile not created yet');
      return NextResponse.json({
        success: true,
        message: 'Expert profile not created yet',
      } as ApiResponse<Expert>);
    }

    const expertDoc = await ExpertModel.findById(userDoc.expertProfile).exec();

    if (!expertDoc) {
      console.log('[DBG][expert/me/route.ts] Expert profile not found');
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<Expert>,
        { status: 404 }
      );
    }

    const expert: Expert = {
      ...expertDoc.toObject(),
      id: expertDoc._id as string,
    };

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
 */
export async function PATCH(request: Request) {
  console.log('[DBG][expert/me/route.ts] PATCH /data/app/expert/me called');

  try {
    // Require authentication
    const session = await getSession();
    if (!session || !session.user) {
      console.log('[DBG][expert/me/route.ts] Unauthorized - no session');
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<Expert>, {
        status: 401,
      });
    }

    const updates = await request.json();
    console.log('[DBG][expert/me/route.ts] Received updates:', Object.keys(updates));

    await connectToDatabase();

    // Get user to check role and expert profile
    const userDoc = await UserModel.findOne({ auth0Id: session.user.sub }).exec();

    if (!userDoc) {
      console.log('[DBG][expert/me/route.ts] User not found');
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<Expert>, {
        status: 404,
      });
    }

    // Check if user is an expert
    if (userDoc.role !== 'expert') {
      console.log('[DBG][expert/me/route.ts] User is not an expert');
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<Expert>,
        { status: 403 }
      );
    }

    if (!userDoc.expertProfile) {
      console.log('[DBG][expert/me/route.ts] Expert profile not found');
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<Expert>,
        { status: 404 }
      );
    }

    // Update expert profile
    // Remove fields that shouldn't be updated directly
    const {
      id,
      _id,
      userId,
      totalCourses,
      totalStudents,
      createdAt,
      updatedAt,
      ...allowedUpdates
    } = updates;

    const expertDoc = await ExpertModel.findByIdAndUpdate(
      userDoc.expertProfile,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    ).exec();

    if (!expertDoc) {
      console.log('[DBG][expert/me/route.ts] Expert profile not found after update');
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<Expert>,
        { status: 404 }
      );
    }

    const expert: Expert = {
      ...expertDoc.toObject(),
      id: expertDoc._id as string,
    };

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
