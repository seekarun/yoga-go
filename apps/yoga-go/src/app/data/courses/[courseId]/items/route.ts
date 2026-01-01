import { NextResponse } from 'next/server';
import type { Lesson, ApiResponse } from '@/types';
import * as courseRepository from '@/lib/repositories/courseRepository';
import * as lessonRepository from '@/lib/repositories/lessonRepository';

// Generate a unique lesson ID
function generateLessonId(courseId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${courseId}-item-${timestamp}-${random}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  console.log(
    `[DBG][courses/[courseId]/items/route.ts] GET /data/courses/${courseId}/items called`
  );

  try {
    // Get course first to find tenantId (cross-tenant lookup)
    const course = await courseRepository.getCourseByIdOnly(courseId);
    if (!course) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: 'Course not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }
    const tenantId = course.instructor.id;

    // Fetch lessons for this course from DynamoDB
    const lessonDocs = await lessonRepository.getLessonsByCourseId(tenantId, courseId);

    if (!lessonDocs || lessonDocs.length === 0) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: 'Course not found or no items available',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Lessons are already in correct format from repository
    const items: Lesson[] = lessonDocs;

    const response: ApiResponse<Lesson[]> = {
      success: true,
      data: items,
      total: items.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      `[DBG][courses/[courseId]/items/route.ts] Error fetching items for ${courseId}:`,
      error
    );
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch course items',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;
  console.log(
    `[DBG][courses/[courseId]/items/route.ts] POST /data/courses/${courseId}/items called`
  );

  try {
    // Check if course exists in DynamoDB (cross-tenant lookup)
    const course = await courseRepository.getCourseByIdOnly(courseId);
    if (!course) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course not found',
        },
        { status: 404 }
      );
    }
    const tenantId = course.instructor.id;

    // Parse request body
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['title', 'duration'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required field: ${field}`,
          },
          { status: 400 }
        );
      }
    }

    // Generate lesson ID
    const lessonId = generateLessonId(courseId);

    // Create lesson in DynamoDB
    const createdLesson = await lessonRepository.createLesson(tenantId, {
      id: lessonId,
      courseId,
      title: body.title,
      duration: body.duration,
      isFree: body.isFree || false,
      description: body.description || '',
      videoUrl: body.videoUrl || '', // Deprecated but keep for backwards compatibility
      cloudflareVideoId: body.cloudflareVideoId || '',
      cloudflareVideoStatus: body.cloudflareVideoStatus || undefined,
      resources: body.resources || [],
      completed: false,
      locked: body.locked || false,
    });

    console.log(`[DBG][courses/[courseId]/items/route.ts] ✓ Created lesson: ${lessonId}`);

    // Optionally add lesson to course curriculum if week is specified
    if (body.week !== undefined) {
      const weekIndex = body.week - 1;
      // Access curriculum with lessonIds property
      const curriculum = (course.curriculum || []).map(w => ({
        week: w.week,
        title: w.title,
        lessonIds: (w as { lessonIds?: string[] }).lessonIds || [],
      }));

      // Ensure the week exists in curriculum
      if (curriculum[weekIndex]) {
        // Add lesson ID to the week's lessonIds
        if (!curriculum[weekIndex].lessonIds) {
          curriculum[weekIndex].lessonIds = [];
        }
        curriculum[weekIndex].lessonIds.push(lessonId);

        // Update course in DynamoDB
        // Cast curriculum through unknown since storage format differs from API format
        await courseRepository.updateCourse(tenantId, courseId, {
          curriculum: curriculum as unknown as typeof course.curriculum,
          totalLessons: (course.totalLessons || 0) + 1,
        });

        console.log(`[DBG][courses/[courseId]/items/route.ts] ✓ Added lesson to week ${body.week}`);
      }
    }

    // Return created lesson
    const response: ApiResponse<Lesson> = {
      success: true,
      data: createdLesson,
      message: 'Lesson created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error(
      `[DBG][courses/[courseId]/items/route.ts] Error creating lesson for ${courseId}:`,
      error
    );
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to create lesson',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
