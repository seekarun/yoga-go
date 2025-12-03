import { NextResponse } from 'next/server';
import type { ApiResponse, Expert, UserRole } from '@/types';
import { getSession, getUserByCognitoSub } from '@/lib/auth';
import * as userRepository from '@/lib/repositories/userRepository';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
import * as paymentRepository from '@/lib/repositories/paymentRepository';

export async function GET() {
  console.log('[DBG][experts/route.ts] GET /data/experts called');

  try {
    // Fetch all experts from DynamoDB
    const expertDocs = await expertRepository.getAllExperts();

    // Calculate dynamic stats for each expert
    const expertsWithStats = await Promise.all(
      expertDocs.map(async (doc: Expert) => {
        const expertId = doc.id;

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
          `[DBG][experts/route.ts] Expert ${doc.name}: ${totalCourses} courses, ${totalStudents} students`
        );

        return {
          ...doc,
          totalCourses,
          totalStudents,
          // Ensure liveStreamingEnabled is always present (default to true if not set)
          liveStreamingEnabled: doc.liveStreamingEnabled ?? true,
          totalLiveSessions: doc.totalLiveSessions ?? 0,
          upcomingLiveSessions: doc.upcomingLiveSessions ?? 0,
        };
      })
    );

    const response: ApiResponse<Expert[]> = {
      success: true,
      data: expertsWithStats as Expert[],
      total: expertsWithStats.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][experts/route.ts] Error fetching experts:', error);
    const response: ApiResponse<Expert[]> = {
      success: false,
      error: 'Failed to fetch experts',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log('[DBG][experts/route.ts] POST /data/experts called');

  try {
    // Check authentication
    const session = await getSession();
    if (!session || !session.user || !session.user.cognitoSub) {
      console.log('[DBG][experts/route.ts] Unauthorized - no session');
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<Expert>, {
        status: 401,
      });
    }

    const body = await request.json();
    console.log('[DBG][experts/route.ts] Received expert data:', body);

    // Validate required fields
    const requiredFields = ['id', 'name', 'title', 'bio', 'avatar'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      const response: ApiResponse<Expert> = {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);

    if (!user) {
      console.log('[DBG][experts/route.ts] User not found');
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<Expert>, {
        status: 404,
      });
    }

    // Check if user already has an expert profile
    if (user.expertProfile) {
      console.log('[DBG][experts/route.ts] User already has an expert profile');
      return NextResponse.json(
        {
          success: false,
          error: 'User already has an expert profile',
        } as ApiResponse<Expert>,
        { status: 409 }
      );
    }

    // Check if expert with this ID already exists in DynamoDB
    const existingExpert = await expertRepository.getExpertById(body.id);
    if (existingExpert) {
      const response: ApiResponse<Expert> = {
        success: false,
        error: 'Expert with this ID already exists',
      };
      return NextResponse.json(response, { status: 409 });
    }

    // Create new expert in DynamoDB
    const newExpert = await expertRepository.createExpert({
      id: body.id,
      userId: user.id, // Link to user account (cognitoSub)
      name: body.name,
      title: body.title,
      bio: body.bio,
      avatar: body.avatar,
      rating: body.rating || 0,
      totalCourses: body.totalCourses || 0,
      totalStudents: body.totalStudents || 0,
      specializations: body.specializations || [],
      featured: body.featured || false,
      certifications: body.certifications || [],
      experience: body.experience || '',
      socialLinks: body.socialLinks || {},
      onboardingCompleted: true, // Mark as completed since they filled the form
    });

    console.log('[DBG][experts/route.ts] Expert created successfully:', newExpert.id);

    // Update user to set role to expert and link expert profile using userRepository
    const updatedRoles: UserRole[] = user.role.includes('expert')
      ? user.role
      : [...user.role, 'expert'];

    await userRepository.updateUser(session.user.cognitoSub, {
      role: updatedRoles,
      expertProfile: newExpert.id,
    });

    console.log('[DBG][experts/route.ts] User updated with expert profile');

    const response: ApiResponse<Expert> = {
      success: true,
      data: newExpert,
      message: 'Expert created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[DBG][experts/route.ts] Error creating expert:', error);
    const response: ApiResponse<Expert> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create expert',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
