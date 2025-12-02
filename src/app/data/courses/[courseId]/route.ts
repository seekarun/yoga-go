import { NextResponse } from 'next/server';
import type { ApiResponse, Course, Lesson } from '@/types';
import * as courseRepository from '@/lib/repositories/courseRepository';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as lessonRepository from '@/lib/repositories/lessonRepository';

export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  console.log(`[DBG][courses/[courseId]/route.ts] GET /data/courses/${courseId} called`);

  try {
    // Fetch course from DynamoDB
    const courseDoc = await courseRepository.getCourseById(courseId);

    if (!courseDoc) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: 'Course not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Fetch all lessons for this course from DynamoDB
    const allLessons = await lessonRepository.getLessonsByCourseId(courseId);

    // Create a map for quick lookup
    const lessonMap = new Map(allLessons.map(l => [l.id, l]));

    // Populate curriculum with actual lesson data
    const populatedCurriculum = (courseDoc.curriculum || []).map(week => {
      // Check if week has lessonIds (stored format) or lessons (API format)
      const lessonIds = (week as { lessonIds?: string[] }).lessonIds || [];
      if (lessonIds.length === 0) {
        return { ...week, lessons: [] };
      }

      // Get lessons for this week from the map
      const lessons = lessonIds
        .map((id: string) => lessonMap.get(id))
        .filter((l): l is NonNullable<typeof l> => l !== undefined) as Lesson[];

      return {
        week: week.week,
        title: week.title,
        lessons,
      };
    });

    // Fetch instructor/expert data from DynamoDB to get current avatar
    let instructorData = courseDoc.instructor;
    if (courseDoc.instructor?.id) {
      const expert = await expertRepository.getExpertById(courseDoc.instructor.id);
      if (expert) {
        instructorData = {
          ...courseDoc.instructor,
          avatar: expert.avatar || courseDoc.instructor.avatar,
        };
      }
    }

    // Build response
    const course: Course = {
      ...courseDoc,
      instructor: instructorData,
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
    // Check if course exists in DynamoDB
    const existingCourse = await courseRepository.getCourseById(courseId);
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
    const updateData: Partial<Course> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.instructor !== undefined) updateData.instructor = body.instructor;
    if (body.thumbnail !== undefined) updateData.thumbnail = body.thumbnail;
    if (body.coverImage !== undefined) updateData.coverImage = body.coverImage;
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

    // Handle curriculum update
    if (body.curriculum !== undefined) {
      updateData.curriculum = body.curriculum;
    }

    // Update course in DynamoDB
    const updatedCourse = await courseRepository.updateCourse(courseId, updateData);

    console.log(`[DBG][courses/[courseId]/route.ts] ✓ Updated course: ${courseId}`);

    const response: ApiResponse<Course> = {
      success: true,
      data: updatedCourse,
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
    // Check if course exists in DynamoDB
    const existingCourse = await courseRepository.getCourseById(courseId);
    if (!existingCourse) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course not found',
        },
        { status: 404 }
      );
    }

    // Delete all lessons associated with this course from DynamoDB
    const deletedCount = await lessonRepository.deleteLessonsByCourseId(courseId);
    console.log(`[DBG][courses/[courseId]/route.ts] ✓ Deleted ${deletedCount} lessons`);

    // Delete the course from DynamoDB
    await courseRepository.deleteCourse(courseId);
    console.log(`[DBG][courses/[courseId]/route.ts] ✓ Deleted course: ${courseId}`);

    const response: ApiResponse<{ deletedCourse: string; deletedLessons: number }> = {
      success: true,
      data: {
        deletedCourse: courseId,
        deletedLessons: deletedCount,
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
