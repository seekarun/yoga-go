import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type { ApiResponse, Course } from '@/types';
import * as courseRepository from '@/lib/repositories/courseRepository';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as tenantRepository from '@/lib/repositories/tenantRepository';

// Generate a unique course ID
function generateCourseId(instructorId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `course-${instructorId}-${timestamp}-${random}`;
}

export async function GET(request: Request) {
  console.log('[DBG][courses/route.ts] GET /data/courses called');

  try {
    // Check for query parameters
    const { searchParams } = new URL(request.url);
    const instructorId = searchParams.get('instructorId');
    const includeAll = searchParams.get('includeAll') === 'true';

    // Check if request is from an expert subdomain/domain
    const headersList = await headers();
    const expertIdFromHeader = headersList.get('x-expert-id');
    const isExpertDomain = !!expertIdFromHeader;

    console.log(
      '[DBG][courses/route.ts] Expert domain:',
      isExpertDomain,
      'Expert ID:',
      expertIdFromHeader
    );

    let courseDocs: Course[];

    // Fetch courses from DynamoDB
    if (instructorId) {
      // For expert dashboard, include IN_PROGRESS and PUBLISHED courses
      if (includeAll) {
        const allCourses = await courseRepository.getCoursesByInstructorId(instructorId);
        courseDocs = allCourses.filter(c => c.status === 'IN_PROGRESS' || c.status === 'PUBLISHED');
      } else {
        courseDocs = await courseRepository.getPublishedCoursesByInstructorId(instructorId);
      }
    } else {
      // For public course listing, only show PUBLISHED courses
      courseDocs = await courseRepository.getCoursesByStatus('PUBLISHED');

      // If on expert domain, only show courses from that expert
      if (isExpertDomain && expertIdFromHeader) {
        courseDocs = courseDocs.filter(c => c.instructor?.id === expertIdFromHeader);
        console.log(
          '[DBG][courses/route.ts] Filtered to expert courses:',
          courseDocs.length,
          'courses'
        );
      } else if (!isExpertDomain) {
        // On primary platform, filter by featuredOnPlatform
        // Get all unique instructor IDs first
        const uniqueInstructorIds = [
          ...new Set(courseDocs.map(c => c.instructor?.id).filter(Boolean)),
        ];

        // Check which experts are featured on platform
        const featuredInstructorIds = new Set<string>();
        for (const instrId of uniqueInstructorIds) {
          if (!instrId) continue;
          const tenant = await tenantRepository.getTenantByExpertId(instrId);
          // Include if no tenant (legacy) or if featuredOnPlatform is true
          if (!tenant || tenant.featuredOnPlatform) {
            featuredInstructorIds.add(instrId);
          }
        }

        // Filter courses to only include those from featured instructors
        courseDocs = courseDocs.filter(
          c => c.instructor?.id && featuredInstructorIds.has(c.instructor.id)
        );

        console.log(
          '[DBG][courses/route.ts] Filtered to platform-featured courses:',
          courseDocs.length,
          'courses'
        );
      }
    }

    // Fetch all unique instructor IDs
    const instructorIds = [...new Set(courseDocs.map(doc => doc.instructor?.id).filter(Boolean))];

    // Fetch expert data for all instructors from DynamoDB
    const expertPromises = instructorIds.map(id => expertRepository.getExpertById(id));
    const experts = await Promise.all(expertPromises);
    const expertMap = new Map(experts.filter(e => e !== null).map(expert => [expert!.id, expert]));

    // Populate instructor avatar from expert data
    const courses: Course[] = courseDocs.map(doc => {
      const course = { ...doc };

      // Populate instructor avatar from expert data
      if (doc.instructor?.id && expertMap.has(doc.instructor.id)) {
        const expert = expertMap.get(doc.instructor.id);
        course.instructor = {
          ...doc.instructor,
          avatar: expert?.avatar || doc.instructor.avatar,
        };
      }

      return course;
    });

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

    // Transform curriculum to use lessons array format
    const curriculum = body.curriculum
      ? (body.curriculum as { week: number; title: string; lessonIds?: string[] }[]).map(week => ({
          week: week.week,
          title: week.title,
          lessons: [], // Empty for now - lessons will be populated when fetching
        }))
      : [];

    // Create course in DynamoDB
    const createdCourse = await courseRepository.createCourse({
      id: courseId,
      title: body.title,
      description: body.description,
      instructor: body.instructor,
      thumbnail: body.thumbnail || '/images/default-course.jpg',
      coverImage: body.coverImage,
      promoVideo: body.promoVideo,
      promoVideoCloudflareId: body.promoVideoCloudflareId,
      promoVideoStatus: body.promoVideoStatus,
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
      status: 'IN_PROGRESS', // New courses start as IN_PROGRESS
      requirements: body.requirements || [],
      whatYouWillLearn: body.whatYouWillLearn || [],
      curriculum,
      reviews: body.reviews || [],
    });

    console.log(`[DBG][courses/route.ts] ✓ Created course: ${courseId}`);

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
