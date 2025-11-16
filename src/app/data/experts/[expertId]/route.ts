import { NextResponse } from 'next/server';
import type { ApiResponse, Expert } from '@/types';
import { connectToDatabase } from '@/lib/mongodb';
import ExpertModel from '@/models/Expert';
import CourseModel from '@/models/Course';
import PaymentModel from '@/models/Payment';

export async function GET(request: Request, { params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = await params;
  console.log(`[DBG][experts/[expertId]/route.ts] GET /data/experts/${expertId} called`);

  try {
    await connectToDatabase();

    // Fetch expert from MongoDB
    const expertDoc = await ExpertModel.findById(expertId).lean().exec();

    if (!expertDoc) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: 'Expert not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Calculate dynamic stats
    // Get actual number of published courses
    const totalCourses = await CourseModel.countDocuments({
      'instructor.id': expertId,
      status: 'PUBLISHED',
    });

    // Get all courses for this expert (for calculating students)
    const expertCourses = await CourseModel.find(
      {
        'instructor.id': expertId,
        status: 'PUBLISHED',
      },
      { _id: 1 }
    ).lean();

    const courseIds = expertCourses.map(c => c._id);

    // Get actual number of unique students (from successful payments)
    const totalStudents =
      courseIds.length > 0
        ? await PaymentModel.distinct('userId', {
            courseId: { $in: courseIds },
            status: 'succeeded',
          }).then(users => users.length)
        : 0;

    console.log(
      `[DBG][experts/[expertId]/route.ts] Expert ${(expertDoc as any).name}: ${totalCourses} courses, ${totalStudents} students`
    );

    // Transform MongoDB document to Expert type with dynamic stats
    const expert: Expert = {
      ...(expertDoc as any),
      id: expertId,
      totalCourses,
      totalStudents,
      // Ensure liveStreamingEnabled is always present (default to true if not set)
      liveStreamingEnabled: (expertDoc as any).liveStreamingEnabled ?? true,
      totalLiveSessions: (expertDoc as any).totalLiveSessions ?? 0,
      upcomingLiveSessions: (expertDoc as any).upcomingLiveSessions ?? 0,
    };

    const response: ApiResponse<Expert> = {
      success: true,
      data: expert,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][experts/[expertId]/route.ts] Error fetching expert ${expertId}:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch expert',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = await params;
  console.log(`[DBG][experts/[expertId]/route.ts] PUT /data/experts/${expertId} called`);

  try {
    await connectToDatabase();

    // Check if expert exists
    const existingExpert = await ExpertModel.findById(expertId).lean().exec();
    if (!existingExpert) {
      return NextResponse.json(
        {
          success: false,
          error: 'Expert not found',
        },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    console.log(`[DBG][experts/[expertId]/route.ts] Received body:`, body);
    console.log(`[DBG][experts/[expertId]/route.ts] customLandingPage:`, body.customLandingPage);

    // Build update object - only include provided fields
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.avatar !== undefined) updateData.avatar = body.avatar;
    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.totalCourses !== undefined) updateData.totalCourses = body.totalCourses;
    if (body.totalStudents !== undefined) updateData.totalStudents = body.totalStudents;
    if (body.specializations !== undefined) updateData.specializations = body.specializations;
    if (body.featured !== undefined) updateData.featured = body.featured;
    if (body.certifications !== undefined) updateData.certifications = body.certifications;
    if (body.experience !== undefined) updateData.experience = body.experience;
    if (body.courses !== undefined) updateData.courses = body.courses;
    if (body.socialLinks !== undefined) updateData.socialLinks = body.socialLinks;
    if (body.promoVideo !== undefined) updateData.promoVideo = body.promoVideo;
    if (body.promoVideoCloudflareId !== undefined)
      updateData.promoVideoCloudflareId = body.promoVideoCloudflareId;
    if (body.promoVideoStatus !== undefined) updateData.promoVideoStatus = body.promoVideoStatus;
    if (body.customLandingPage !== undefined) updateData.customLandingPage = body.customLandingPage;

    console.log(`[DBG][experts/[expertId]/route.ts] Update data:`, updateData);
    console.log(
      `[DBG][experts/[expertId]/route.ts] customLandingPage to save:`,
      updateData.customLandingPage
    );

    // Update expert
    const updatedExpert = await ExpertModel.findByIdAndUpdate(expertId, updateData, {
      new: true,
      lean: true,
    }).exec();

    console.log(`[DBG][experts/[expertId]/route.ts] ✓ Updated expert: ${expertId}`);
    console.log(
      `[DBG][experts/[expertId]/route.ts] Saved customLandingPage:`,
      (updatedExpert as any)?.customLandingPage
    );

    // Transform response
    const expert: Expert = {
      ...(updatedExpert as any),
      id: (updatedExpert as any)._id as string,
    };

    const response: ApiResponse<Expert> = {
      success: true,
      data: expert,
      message: 'Expert updated successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][experts/[expertId]/route.ts] Error updating expert ${expertId}:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to update expert',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
