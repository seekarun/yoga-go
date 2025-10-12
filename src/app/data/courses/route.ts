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

export async function GET() {
  console.log('[DBG][courses/route.ts] GET /data/courses called');

  try {
    await connectToDatabase();

    // Fetch all courses from MongoDB
    const courseDocs = await CourseModel.find({}).lean().exec();

    // Transform MongoDB documents to Course type
    const courses: Course[] = courseDocs.map((doc: any) => ({
      ...doc,
      id: doc._id as string,
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
      ? body.curriculum.map((week: any) => ({
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
      ...courseData,
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
