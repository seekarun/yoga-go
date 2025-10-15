import { NextResponse } from 'next/server';
import type { ApiResponse, Course } from '@/types';
import { connectToDatabase } from '@/lib/mongodb';
import CourseModel from '@/models/Course';

// Generate a unique course ID
function generateCourseId(instructorId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `course-${instructorId}-${timestamp}-${random}`;
}

export async function GET(request: Request) {
  console.log('[DBG][courses/route.ts] GET /data/courses called');

  try {
    await connectToDatabase();

    // Check for query parameters
    const { searchParams } = new URL(request.url);
    const instructorId = searchParams.get('instructorId');
    const includeAll = searchParams.get('includeAll') === 'true';

    const query: Record<string, unknown> = {};

    // If instructorId is provided, filter by instructor
    if (instructorId) {
      query['instructor.id'] = instructorId;
      // For expert dashboard, include IN_PROGRESS and PUBLISHED courses
      if (includeAll) {
        query.status = { $in: ['IN_PROGRESS', 'PUBLISHED'] };
      }
    } else {
      // For public course listing, only show PUBLISHED courses
      query.status = 'PUBLISHED';
    }

    // Fetch courses from MongoDB
    const courseDocs = await CourseModel.find(query).lean().exec();

    // Transform MongoDB documents to Course type
    const courses: Course[] = courseDocs.map(doc => ({
      ...(doc as unknown as Course),
      id: (doc as { _id: string })._id,
    }));

    const response: ApiResponse<Course[]> = {
      success: true,
      data: courses,
      total: courses.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][courses/route.ts] Error fetching courses:', error);
    const response: ApiResponse<Course[]> = {
      success: false,
      error: 'Failed to fetch courses',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log('[DBG][courses/route.ts] POST /data/courses called');

  try {
    await connectToDatabase();

    // Parse request body
    const body = await request.json();

    // Validate only truly required fields (those in the form)
    const requiredFields = [
      'title',
      'description',
      'instructor',
      'level',
      'duration',
      'price',
      'category',
    ];

    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        // Allow 0 as valid value
        return NextResponse.json(
          {
            success: false,
            error: `Missing required field: ${field}`,
          },
          { status: 400 }
        );
      }
    }

    // Validate instructor object
    if (!body.instructor.id || !body.instructor.name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Instructor must have id and name',
        },
        { status: 400 }
      );
    }

    // Generate course ID
    const courseId = generateCourseId(body.instructor.id);

    // Transform curriculum to use lessonIds if provided
    const curriculum = body.curriculum
      ? (body.curriculum as { week: number; title: string; lessonIds?: string[] }[]).map(week => ({
          week: week.week,
          title: week.title,
          lessonIds: week.lessonIds || [],
        }))
      : [];

    // Create course document with defaults for optional fields
    const courseData = {
      _id: courseId,
      title: body.title,
      description: body.description,
      longDescription: body.longDescription || body.description,
      instructor: body.instructor,
      thumbnail: body.thumbnail || '/images/default-course.jpg',
      promoVideo: body.promoVideo || undefined,
      promoVideoCloudflareId: body.promoVideoCloudflareId || undefined,
      promoVideoStatus: body.promoVideoStatus || undefined,
      level: body.level,
      duration: body.duration,
      totalLessons: body.totalLessons !== undefined ? body.totalLessons : 0,
      freeLessons: body.freeLessons !== undefined ? body.freeLessons : 0,
      price: body.price,
      rating: body.rating !== undefined ? body.rating : 5.0,
      totalRatings: body.totalRatings || 0,
      totalStudents: body.totalStudents !== undefined ? body.totalStudents : 0,
      category: body.category,
      tags: body.tags || [],
      featured: body.featured || false,
      isNew: body.isNew !== undefined ? body.isNew : true,
      status: 'IN_PROGRESS' as const, // New courses start as IN_PROGRESS
      requirements: body.requirements || [],
      whatYouWillLearn: body.whatYouWillLearn || [],
      curriculum,
      reviews: body.reviews || [],
    };

    const course = new CourseModel(courseData);
    await course.save();

    console.log(`[DBG][courses/route.ts] ✓ Created course: ${courseId}`);

    // Return created course
    const createdCourse: Course = {
      ...(courseData as unknown as Course),
      id: courseId,
    };

    const response: ApiResponse<Course> = {
      success: true,
      data: createdCourse,
      message: 'Course created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[DBG][courses/route.ts] Error creating course:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to create course',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
