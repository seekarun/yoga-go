import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import * as userRepository from '@/lib/repositories/userRepository';
import type { User, Membership } from '@/types';

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

    const user = await userRepository.getUserById(userId);

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
        id: user.id,
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

    const user = await userRepository.getUserById(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Build updates object
    const updates: Partial<User> = {};

    // Update profile fields if provided
    if (body.profile) {
      updates.profile = { ...user.profile, ...body.profile };
    }

    // Update membership if provided
    if (body.membership) {
      updates.membership = { ...user.membership, ...body.membership };
    }

    // Update status (suspend/activate)
    if (body.status) {
      const membershipUpdate: Membership = (updates.membership as Membership) || {
        ...user.membership,
      };
      membershipUpdate.status = body.status;
      if (body.status === 'cancelled') {
        membershipUpdate.cancelledAt = new Date().toISOString();
      }
      updates.membership = membershipUpdate;
    }

    const updatedUser = await userRepository.updateUser(userId, updates);

    console.log('[DBG][admn/users/userId] User updated successfully');

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        profile: updatedUser.profile,
        membership: updatedUser.membership,
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

    const user = await userRepository.getUserById(userId);

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
    const isAdmin = Array.isArray(user.role) ? user.role.includes('admin') : false;
    if (isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete admin users',
        },
        { status: 403 }
      );
    }

    await userRepository.deleteUser(userId);

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
