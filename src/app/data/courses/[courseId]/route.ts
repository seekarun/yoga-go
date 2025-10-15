import { NextResponse } from 'next/server';
import type { ApiResponse, Course, Lesson } from '@/types';
import { connectToDatabase } from '@/lib/mongodb';
import CourseModel from '@/models/Course';
import LessonModel from '@/models/Lesson';

export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  console.log(`[DBG][courses/[courseId]/route.ts] GET /data/courses/${courseId} called`);

  try {
    await connectToDatabase();

    // Fetch course from MongoDB
    const courseDoc = await CourseModel.findOne({ _id: courseId }).lean().exec();

    if (!courseDoc) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: 'Course not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Populate curriculum with actual lesson data
    const populatedCurriculum = await Promise.all(
      (
        ((courseDoc as Record<string, unknown>).curriculum as {
          week: number;
          title: string;
          lessonIds: string[];
        }[]) || []
      ).map(async week => {
        if (!week.lessonIds || week.lessonIds.length === 0) {
          return { ...week, lessons: [] };
        }

        // Fetch lessons for this week
        const lessonDocs = await LessonModel.find({ _id: { $in: week.lessonIds } })
          .lean()
          .exec();

        // Transform lessons
        const lessons: Lesson[] = lessonDocs.map(doc => ({
          ...(doc as unknown as Lesson),
          id: (doc as { _id: string })._id,
        }));

        return {
          week: week.week,
          title: week.title,
          lessons,
        };
      })
    );

    // Transform MongoDB document to Course type
    const course: Course = {
      ...(courseDoc as unknown as Course),
      id: (courseDoc as { _id: string })._id,
      curriculum: populatedCurriculum,
    };

    const response: ApiResponse<Course> = {
      success: true,
      data: course,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][courses/[courseId]/route.ts] Error fetching course ${courseId}:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch course',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  console.log(`[DBG][courses/[courseId]/route.ts] PUT /data/courses/${courseId} called`);

  try {
    await connectToDatabase();

    // Check if course exists
    const existingCourse = await CourseModel.findOne({ _id: courseId }).lean().exec();
    if (!existingCourse) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course not found',
        },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Build update object - only include provided fields
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.longDescription !== undefined) updateData.longDescription = body.longDescription;
    if (body.instructor !== undefined) updateData.instructor = body.instructor;
    if (body.thumbnail !== undefined) updateData.thumbnail = body.thumbnail;
    if (body.promoVideo !== undefined) updateData.promoVideo = body.promoVideo;
    if (body.promoVideoCloudflareId !== undefined)
      updateData.promoVideoCloudflareId = body.promoVideoCloudflareId;
    if (body.promoVideoStatus !== undefined) updateData.promoVideoStatus = body.promoVideoStatus;
    if (body.level !== undefined) updateData.level = body.level;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.totalLessons !== undefined) updateData.totalLessons = body.totalLessons;
    if (body.freeLessons !== undefined) updateData.freeLessons = body.freeLessons;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.totalRatings !== undefined) updateData.totalRatings = body.totalRatings;
    if (body.totalStudents !== undefined) updateData.totalStudents = body.totalStudents;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.featured !== undefined) updateData.featured = body.featured;
    if (body.isNew !== undefined) updateData.isNew = body.isNew;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.requirements !== undefined) updateData.requirements = body.requirements;
    if (body.whatYouWillLearn !== undefined) updateData.whatYouWillLearn = body.whatYouWillLearn;
    if (body.reviews !== undefined) updateData.reviews = body.reviews;

    // Handle curriculum update - transform to use lessonIds
    if (body.curriculum !== undefined) {
      updateData.curriculum = (
        body.curriculum as { week: number; title: string; lessonIds?: string[] }[]
      ).map(week => ({
        week: week.week,
        title: week.title,
        lessonIds: week.lessonIds || [],
      }));
    }

    // Update course
    const updatedCourse = await CourseModel.findOneAndUpdate({ _id: courseId }, updateData, {
      new: true,
      lean: true,
    }).exec();

    console.log(`[DBG][courses/[courseId]/route.ts] ✓ Updated course: ${courseId}`);

    // Transform response
    const course: Course = {
      ...(updatedCourse as unknown as Course),
      id: (updatedCourse as { _id: string })._id,
    };

    const response: ApiResponse<Course> = {
      success: true,
      data: course,
      message: 'Course updated successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][courses/[courseId]/route.ts] Error updating course ${courseId}:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to update course',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;
  console.log(`[DBG][courses/[courseId]/route.ts] DELETE /data/courses/${courseId} called`);

  try {
    await connectToDatabase();

    // Check if course exists
    const existingCourse = await CourseModel.findOne({ _id: courseId }).lean().exec();
    if (!existingCourse) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course not found',
        },
        { status: 404 }
      );
    }

    // Delete all lessons associated with this course
    const deletedLessons = await LessonModel.deleteMany({ courseId }).exec();
    console.log(
      `[DBG][courses/[courseId]/route.ts] ✓ Deleted ${deletedLessons.deletedCount} lessons`
    );

    // Delete the course
    await CourseModel.findOneAndDelete({ _id: courseId }).exec();
    console.log(`[DBG][courses/[courseId]/route.ts] ✓ Deleted course: ${courseId}`);

    const response: ApiResponse<{ deletedCourse: string; deletedLessons: number }> = {
      success: true,
      data: {
        deletedCourse: courseId,
        deletedLessons: deletedLessons.deletedCount,
      },
      message: 'Course and associated lessons deleted successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][courses/[courseId]/route.ts] Error deleting course ${courseId}:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to delete course',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
