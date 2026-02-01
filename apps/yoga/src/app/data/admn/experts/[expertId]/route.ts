import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import * as userRepository from '@/lib/repositories/userRepository';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
import type { Expert as ExpertType, User } from '@/types';

/**
 * GET /data/admn/experts/[expertId]
 * Get detailed expert information for admin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ expertId: string }> }
) {
  try {
    // Require admin authentication
    await requireAdminAuth();

    const { expertId } = await params;
    console.log('[DBG][admn/experts/expertId] Fetching expert:', expertId);

    // Find expert profile from DynamoDB
    const expertProfile = await expertRepository.getExpertById(expertId);

    if (!expertProfile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Expert not found',
        },
        { status: 404 }
      );
    }

    // Find associated user account from DynamoDB using userId
    const user = expertProfile.userId
      ? await userRepository.getUserById(expertProfile.userId)
      : null;

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User account not found for this expert',
        },
        { status: 404 }
      );
    }

    // Get expert's courses from DynamoDB
    const courses = await courseRepository.getCoursesByInstructorId(expertId);

    console.log('[DBG][admn/experts/expertId] Found expert:', expertProfile.name);

    return NextResponse.json({
      success: true,
      data: {
        // Expert profile data
        expert: {
          id: expertProfile.id,
          name: expertProfile.name,
          title: expertProfile.title,
          bio: expertProfile.bio,
          avatar: expertProfile.avatar,
          rating: expertProfile.rating,
          totalCourses: expertProfile.totalCourses,
          totalStudents: expertProfile.totalStudents,
          specializations: expertProfile.specializations,
          featured: expertProfile.featured,
          certifications: expertProfile.certifications,
          experience: expertProfile.experience,
          socialLinks: expertProfile.socialLinks,
          onboardingCompleted: expertProfile.onboardingCompleted,
          createdAt: expertProfile.createdAt,
          updatedAt: expertProfile.updatedAt,
        },
        // User account data
        user: {
          id: user.id,
          profile: user.profile,
          membership: user.membership,
          statistics: user.statistics,
          createdAt: user.createdAt,
        },
        // Courses
        courses: courses.map(c => ({
          id: c.id,
          title: c.title,
          status: c.status,
          totalStudents: c.totalStudents,
          rating: c.rating,
          price: c.price,
        })),
      },
    });
  } catch (error) {
    console.error('[DBG][admn/experts/expertId] Error fetching expert:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch expert',
      },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}

/**
 * PUT /data/admn/experts/[expertId]
 * Update expert information (admin only)
 * Body: { expert?, user?, status?, featured? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ expertId: string }> }
) {
  try {
    // Require admin authentication
    await requireAdminAuth();

    const { expertId } = await params;
    const body = await request.json();

    console.log('[DBG][admn/experts/expertId] Updating expert:', expertId, 'with data:', body);

    // Get expert from DynamoDB
    const expertProfile = await expertRepository.getExpertById(expertId);

    if (!expertProfile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Expert not found',
        },
        { status: 404 }
      );
    }

    // Build expert updates
    const expertUpdates: Partial<ExpertType> = {};

    // Update expert profile fields if provided
    if (body.expert) {
      Object.assign(expertUpdates, body.expert);
    }

    // Update featured status if provided
    if (typeof body.featured === 'boolean') {
      expertUpdates.featured = body.featured;
    }

    // Update expert in DynamoDB
    const updatedExpert = await expertRepository.updateExpert(expertId, expertUpdates);

    // Update associated user account if user data provided
    if (body.user || body.status) {
      // Find user by userId from expert profile
      const user = expertProfile.userId
        ? await userRepository.getUserById(expertProfile.userId)
        : null;

      if (user) {
        const updates: Partial<User> = {};

        if (body.user) {
          // Merge user updates
          if (body.user.profile) {
            updates.profile = { ...user.profile, ...body.user.profile };
          }
          if (body.user.membership) {
            updates.membership = { ...user.membership, ...body.user.membership };
          }
        }

        if (body.status) {
          const membershipUpdate = updates.membership || { ...user.membership };
          membershipUpdate.status = body.status;
          if (body.status === 'cancelled') {
            membershipUpdate.cancelledAt = new Date().toISOString();
          }
          updates.membership = membershipUpdate;
        }

        await userRepository.updateUser(user.id, updates);
      }
    }

    console.log('[DBG][admn/experts/expertId] Expert updated successfully');

    return NextResponse.json({
      success: true,
      data: {
        expert: updatedExpert,
      },
      message: 'Expert updated successfully',
    });
  } catch (error) {
    console.error('[DBG][admn/experts/expertId] Error updating expert:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update expert',
      },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}

/**
 * DELETE /data/admn/experts/[expertId]
 * Delete expert account (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ expertId: string }> }
) {
  try {
    // Require admin authentication
    await requireAdminAuth();

    const { expertId } = await params;
    console.log('[DBG][admn/experts/expertId] Deleting expert:', expertId);

    // Get expert from DynamoDB
    const expertProfile = await expertRepository.getExpertById(expertId);

    if (!expertProfile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Expert not found',
        },
        { status: 404 }
      );
    }

    // Delete expert profile from DynamoDB
    await expertRepository.deleteExpert(expertId);

    // Delete associated user from DynamoDB if exists
    if (expertProfile.userId) {
      await userRepository.deleteUser(expertProfile.userId);
    }

    // Note: Courses are not deleted, just orphaned
    // You may want to handle this differently based on business logic

    console.log('[DBG][admn/experts/expertId] Expert deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Expert deleted successfully',
    });
  } catch (error) {
    console.error('[DBG][admn/experts/expertId] Error deleting expert:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete expert',
      },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}
