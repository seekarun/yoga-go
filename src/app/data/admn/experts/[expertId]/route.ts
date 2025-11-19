import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Expert from '@/models/Expert';
import Course from '@/models/Course';
import type { Expert as ExpertType } from '@/types';
import type { UserDocument } from '@/models/User';

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

    await connectToDatabase();

    // Find expert profile
    const expertProfile = (await Expert.findById(expertId).lean()) as ExpertType | null;

    if (!expertProfile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Expert not found',
        },
        { status: 404 }
      );
    }

    // Find associated user account
    const user = (await User.findOne({ expertProfile: expertId }).lean()) as
      | (UserDocument & { _id: string })
      | null;

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User account not found for this expert',
        },
        { status: 404 }
      );
    }

    // Get expert's courses
    const courses = await Course.find({ 'instructor.id': expertId }).lean();

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
          id: user._id,
          auth0Id: user.auth0Id,
          profile: user.profile,
          membership: user.membership,
          statistics: user.statistics,
          createdAt: user.createdAt,
        },
        // Courses
        courses: courses.map(c => ({
          id: c._id,
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

    await connectToDatabase();

    const expertProfile = await Expert.findById(expertId);

    if (!expertProfile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Expert not found',
        },
        { status: 404 }
      );
    }

    // Update expert profile fields if provided
    if (body.expert) {
      Object.assign(expertProfile, body.expert);
    }

    // Update featured status if provided
    if (typeof body.featured === 'boolean') {
      expertProfile.featured = body.featured;
    }

    await expertProfile.save();

    // Update associated user account if user data provided
    if (body.user || body.status) {
      const user = await User.findOne({ expertProfile: expertId });
      if (user) {
        if (body.user) {
          Object.assign(user, body.user);
        }
        if (body.status) {
          user.membership.status = body.status;
          if (body.status === 'cancelled') {
            user.membership.cancelledAt = new Date().toISOString();
          }
        }
        await user.save();
      }
    }

    console.log('[DBG][admn/experts/expertId] Expert updated successfully');

    return NextResponse.json({
      success: true,
      data: {
        expert: expertProfile,
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

    await connectToDatabase();

    const expertProfile = await Expert.findById(expertId);

    if (!expertProfile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Expert not found',
        },
        { status: 404 }
      );
    }

    // Delete expert profile
    await Expert.findByIdAndDelete(expertId);

    // Delete associated user account
    await User.deleteOne({ expertProfile: expertId });

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
