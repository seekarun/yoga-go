import { NextResponse } from 'next/server';
import type { Lesson, ApiResponse } from '@/types';
import * as courseRepository from '@/lib/repositories/courseRepository';
import * as lessonRepository from '@/lib/repositories/lessonRepository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string; itemId: string }> }
) {
  const { courseId, itemId } = await params;
  console.log(
    `[DBG][courses/[courseId]/items/[itemId]/route.ts] GET /data/courses/${courseId}/items/${itemId} called`
  );

  try {
    // Fetch specific lesson from DynamoDB
    const lessonDoc = await lessonRepository.getLessonById(courseId, itemId);

    if (!lessonDoc) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: 'Course item not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Lesson is already in correct format from repository
    const item: Lesson = lessonDoc;

    const response: ApiResponse<Lesson> = {
      success: true,
      data: item,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      `[DBG][courses/[courseId]/items/[itemId]/route.ts] Error fetching item ${itemId}:`,
      error
    );
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch course item',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ courseId: string; itemId: string }> }
) {
  const { courseId, itemId } = await params;
  console.log(
    `[DBG][courses/[courseId]/items/[itemId]/route.ts] PUT /data/courses/${courseId}/items/${itemId} called`
  );

  try {
    // Check if lesson exists
    const existingLesson = await lessonRepository.getLessonById(courseId, itemId);
    if (!existingLesson) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course item not found',
        },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Build update object - only include provided fields
    const updateData: Partial<Lesson> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.isFree !== undefined) updateData.isFree = body.isFree;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl; // Deprecated
    if (body.cloudflareVideoId !== undefined) updateData.cloudflareVideoId = body.cloudflareVideoId;
    if (body.cloudflareVideoStatus !== undefined)
      updateData.cloudflareVideoStatus = body.cloudflareVideoStatus;
    if (body.resources !== undefined) updateData.resources = body.resources;
    if (body.completed !== undefined) updateData.completed = body.completed;
    if (body.completedAt !== undefined) updateData.completedAt = body.completedAt;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.locked !== undefined) updateData.locked = body.locked;

    // Update lesson in DynamoDB
    const updatedLesson = await lessonRepository.updateLesson(courseId, itemId, updateData);

    console.log(`[DBG][courses/[courseId]/items/[itemId]/route.ts] ✓ Updated lesson: ${itemId}`);

    // Lesson is already in correct format from repository
    const item: Lesson = updatedLesson;

    const response: ApiResponse<Lesson> = {
      success: true,
      data: item,
      message: 'Lesson updated successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      `[DBG][courses/[courseId]/items/[itemId]/route.ts] Error updating item ${itemId}:`,
      error
    );
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to update course item',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ courseId: string; itemId: string }> }
) {
  const { courseId, itemId } = await params;
  console.log(
    `[DBG][courses/[courseId]/items/[itemId]/route.ts] DELETE /data/courses/${courseId}/items/${itemId} called`
  );

  try {
    // Check if lesson exists
    const existingLesson = await lessonRepository.getLessonById(courseId, itemId);
    if (!existingLesson) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course item not found',
        },
        { status: 404 }
      );
    }

    // Delete the lesson from DynamoDB
    await lessonRepository.deleteLesson(courseId, itemId);
    console.log(`[DBG][courses/[courseId]/items/[itemId]/route.ts] ✓ Deleted lesson: ${itemId}`);

    // Remove lesson from course curriculum in DynamoDB
    const course = await courseRepository.getCourseById(courseId);
    if (course) {
      // Access curriculum with lessonIds property
      const curriculum = (course.curriculum || []).map(w => ({
        week: w.week,
        title: w.title,
        lessonIds: (w as { lessonIds?: string[] }).lessonIds || [],
      }));
      let lessonRemoved = false;

      // Remove lesson ID from all weeks in curriculum
      const updatedCurriculum = curriculum.map(week => {
        if (week.lessonIds && week.lessonIds.includes(itemId)) {
          lessonRemoved = true;
          return {
            ...week,
            lessonIds: week.lessonIds.filter(id => id !== itemId),
          };
        }
        return week;
      });

      // Update course if lesson was removed from curriculum
      if (lessonRemoved) {
        // Cast curriculum through unknown since storage format differs from API format
        await courseRepository.updateCourse(courseId, {
          curriculum: updatedCurriculum as unknown as typeof course.curriculum,
          totalLessons: Math.max(0, (course.totalLessons || 0) - 1),
        });
        console.log(
          `[DBG][courses/[courseId]/items/[itemId]/route.ts] ✓ Removed lesson from course curriculum`
        );
      }
    }

    const response: ApiResponse<{ deletedLesson: string }> = {
      success: true,
      data: {
        deletedLesson: itemId,
      },
      message: 'Lesson deleted successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      `[DBG][courses/[courseId]/items/[itemId]/route.ts] Error deleting item ${itemId}:`,
      error
    );
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to delete course item',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
