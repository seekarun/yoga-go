import { NextResponse } from 'next/server';
import type { Lesson, ApiResponse } from '@/types';
import { connectToDatabase } from '@/lib/mongodb';
import LessonModel from '@/models/Lesson';
import CourseModel from '@/models/Course';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string; itemId: string }> }
) {
  const { courseId, itemId } = await params;
  console.log(
    `[DBG][courses/[courseId]/items/[itemId]/route.ts] GET /data/courses/${courseId}/items/${itemId} called`
  );

  try {
    await connectToDatabase();

    // Fetch specific lesson from MongoDB
    const lessonDoc = await LessonModel.findOne({ _id: itemId, courseId }).lean().exec();

    if (!lessonDoc) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: 'Course item not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Transform MongoDB document to Lesson type
    const item: Lesson = {
      ...(lessonDoc as any),
      id: (lessonDoc as any)._id as string,
    };

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
    await connectToDatabase();

    // Check if lesson exists
    const existingLesson = await LessonModel.findOne({ _id: itemId, courseId }).lean().exec();
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
    const updateData: any = {};

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

    // Update lesson
    const updatedLesson = await LessonModel.findOneAndUpdate(
      { _id: itemId, courseId },
      updateData,
      {
        new: true,
        lean: true,
      }
    ).exec();

    console.log(`[DBG][courses/[courseId]/items/[itemId]/route.ts] ✓ Updated lesson: ${itemId}`);

    // Transform response
    const item: Lesson = {
      ...(updatedLesson as any),
      id: (updatedLesson as any)._id as string,
    };

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
    await connectToDatabase();

    // Check if lesson exists
    const existingLesson = await LessonModel.findOne({ _id: itemId, courseId }).lean().exec();
    if (!existingLesson) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course item not found',
        },
        { status: 404 }
      );
    }

    // Delete the lesson
    await LessonModel.findOneAndDelete({ _id: itemId, courseId }).exec();
    console.log(`[DBG][courses/[courseId]/items/[itemId]/route.ts] ✓ Deleted lesson: ${itemId}`);

    // Remove lesson from course curriculum
    const course = await CourseModel.findById(courseId).lean().exec();
    if (course) {
      const curriculum = (course as any).curriculum || [];
      let lessonRemoved = false;

      // Remove lesson ID from all weeks in curriculum
      const updatedCurriculum = curriculum.map((week: any) => {
        if (week.lessonIds && week.lessonIds.includes(itemId)) {
          lessonRemoved = true;
          return {
            ...week,
            lessonIds: week.lessonIds.filter((id: string) => id !== itemId),
          };
        }
        return week;
      });

      // Update course if lesson was removed from curriculum
      if (lessonRemoved) {
        await CourseModel.findByIdAndUpdate(courseId, {
          curriculum: updatedCurriculum,
          totalLessons: Math.max(0, (course as any).totalLessons - 1),
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
