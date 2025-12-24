import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type { ApiResponse, Expert } from '@/types';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
import * as paymentRepository from '@/lib/repositories/paymentRepository';

export async function GET(request: Request, { params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = await params;
  const headersList = await headers();
  const previewMode = headersList.get('x-preview-mode');
  const isDraftPreview = previewMode === 'draft';

  console.log(
    `[DBG][experts/[expertId]/route.ts] GET /data/experts/${expertId} called`,
    isDraftPreview ? '(draft preview)' : ''
  );

  try {
    // Fetch expert from DynamoDB
    const expertDoc = await expertRepository.getExpertById(expertId);

    if (!expertDoc) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: 'Expert not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Calculate dynamic stats
    // Get published courses for this expert from DynamoDB
    const expertCourses = await courseRepository.getPublishedCoursesByInstructorId(expertId);
    const totalCourses = expertCourses.length;
    const courseIds = expertCourses.map(c => c.id);

    // Get actual number of unique students (from successful payments in DynamoDB)
    let totalStudents = 0;
    if (courseIds.length > 0) {
      const uniqueUserIds = new Set<string>();
      for (const courseId of courseIds) {
        const payments = await paymentRepository.getSuccessfulPaymentsByCourse(courseId);
        payments.forEach(p => uniqueUserIds.add(p.userId));
      }
      totalStudents = uniqueUserIds.size;
    }

    console.log(
      `[DBG][experts/[expertId]/route.ts] Expert ${expertDoc.name}: ${totalCourses} courses, ${totalStudents} students`
    );

    // Transform to Expert type with dynamic stats
    let expert: Expert = {
      ...expertDoc,
      totalCourses,
      totalStudents,
    };

    // In draft preview mode, serve draftLandingPage as customLandingPage
    // This allows the preview page to render the draft content
    if (isDraftPreview && expertDoc.draftLandingPage) {
      console.log('[DBG][experts/[expertId]/route.ts] Serving draft landing page for preview');
      expert = {
        ...expert,
        customLandingPage: expertDoc.draftLandingPage,
      };
    }

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
    // Check if expert exists in DynamoDB
    const existingExpert = await expertRepository.getExpertById(expertId);
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
    const updateData: Partial<Expert> = {};

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
    if (body.socialLinks !== undefined) updateData.socialLinks = body.socialLinks;
    if (body.promoVideo !== undefined) updateData.promoVideo = body.promoVideo;
    if (body.promoVideoCloudflareId !== undefined)
      updateData.promoVideoCloudflareId = body.promoVideoCloudflareId;
    if (body.promoVideoStatus !== undefined) updateData.promoVideoStatus = body.promoVideoStatus;
    // Save landing page changes to DRAFT, not published
    // Use draftLandingPage for work-in-progress changes visible on preview.myyoga.guru
    if (body.customLandingPage !== undefined) updateData.draftLandingPage = body.customLandingPage;

    console.log(`[DBG][experts/[expertId]/route.ts] Update data:`, updateData);
    console.log(
      `[DBG][experts/[expertId]/route.ts] draftLandingPage to save:`,
      updateData.draftLandingPage
    );

    // Update expert in DynamoDB
    const updatedExpert = await expertRepository.updateExpert(expertId, updateData);

    console.log(`[DBG][experts/[expertId]/route.ts] ✓ Updated expert: ${expertId}`);
    console.log(
      `[DBG][experts/[expertId]/route.ts] Saved draftLandingPage:`,
      updatedExpert.draftLandingPage
    );

    const response: ApiResponse<Expert> = {
      success: true,
      data: updatedExpert,
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
