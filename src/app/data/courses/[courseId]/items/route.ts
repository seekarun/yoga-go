import { NextResponse } from 'next/server';
import type { Lesson, ApiResponse } from '@/types';
import { connectToDatabase } from '@/lib/mongodb';
import LessonModel from '@/models/Lesson';
import CourseModel from '@/models/Course';

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
    await connectToDatabase();

    // Fetch lessons for this course from MongoDB
    const lessonDocs = await LessonModel.find({ courseId }).lean().exec();

    if (!lessonDocs || lessonDocs.length === 0) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: 'Course not found or no items available',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Transform MongoDB documents to Lesson type
    const items: Lesson[] = lessonDocs.map((doc: any) => ({
      ...doc,
      id: doc._id as string,
    }));

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
    await connectToDatabase();

    // Check if course exists
    const course = await CourseModel.findById(courseId).lean().exec();
    if (!course) {
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

    // Create lesson document
    const lessonData = {
      _id: lessonId,
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
    };

    const lesson = new LessonModel(lessonData);
    await lesson.save();

    console.log(`[DBG][courses/[courseId]/items/route.ts] ✓ Created lesson: ${lessonId}`);

    // Optionally add lesson to course curriculum if week is specified
    if (body.week !== undefined) {
      const weekIndex = body.week - 1;
      const curriculum = (course as any).curriculum || [];

      // Ensure the week exists in curriculum
      if (curriculum[weekIndex]) {
        // Add lesson ID to the week's lessonIds
        if (!curriculum[weekIndex].lessonIds) {
          curriculum[weekIndex].lessonIds = [];
        }
        curriculum[weekIndex].lessonIds.push(lessonId);

        // Update course
        await CourseModel.findByIdAndUpdate(courseId, {
          curriculum,
          totalLessons: (course as any).totalLessons + 1,
        });

        console.log(`[DBG][courses/[courseId]/items/route.ts] ✓ Added lesson to week ${body.week}`);
      }
    }

    // Return created lesson
    const createdLesson: Lesson = {
      ...lessonData,
      id: lessonId,
    };

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
