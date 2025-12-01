import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import type { UserDocument } from '@/models/User';

/**
 * GET /data/admn/users/[userId]
 * Get detailed user information for admin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Require admin authentication
    await requireAdminAuth();

    const { userId } = await params;
    console.log('[DBG][admn/users/userId] Fetching user:', userId);

    await connectToDatabase();

    const user = (await User.findById(userId).lean()) as (UserDocument & { _id: string }) | null;

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    console.log('[DBG][admn/users/userId] Found user:', user.profile.email);

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        cognitoSub: user.cognitoSub,
        role: user.role,
        profile: user.profile,
        membership: user.membership,
        statistics: user.statistics,
        achievements: user.achievements,
        enrolledCourses: user.enrolledCourses,
        preferences: user.preferences,
        billing: user.billing,
        savedItems: user.savedItems,
        social: user.social,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('[DBG][admn/users/userId] Error fetching user:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user',
      },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}

/**
 * PUT /data/admn/users/[userId]
 * Update user information (admin only)
 * Body: { profile?, membership?, status? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Require admin authentication
    await requireAdminAuth();

    const { userId } = await params;
    const body = await request.json();

    console.log('[DBG][admn/users/userId] Updating user:', userId, 'with data:', body);

    await connectToDatabase();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Update profile fields if provided
    if (body.profile) {
      Object.assign(user.profile, body.profile);
    }

    // Update membership if provided
    if (body.membership) {
      Object.assign(user.membership, body.membership);
    }

    // Update status (suspend/activate)
    if (body.status) {
      user.membership.status = body.status;
      if (body.status === 'cancelled') {
        user.membership.cancelledAt = new Date().toISOString();
      }
    }

    await user.save();

    console.log('[DBG][admn/users/userId] User updated successfully');

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        profile: user.profile,
        membership: user.membership,
      },
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('[DBG][admn/users/userId] Error updating user:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
      },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}

/**
 * DELETE /data/admn/users/[userId]
 * Delete user account (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Require admin authentication
    await requireAdminAuth();

    const { userId } = await params;
    console.log('[DBG][admn/users/userId] Deleting user:', userId);

    await connectToDatabase();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Don't allow deleting admin users (role is now an array)
    const isAdmin = Array.isArray(user.role) ? user.role.includes('admin') : user.role === 'admin';
    if (isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete admin users',
        },
        { status: 403 }
      );
    }

    await User.findByIdAndDelete(userId);

    console.log('[DBG][admn/users/userId] User deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('[DBG][admn/users/userId] Error deleting user:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user',
      },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}
