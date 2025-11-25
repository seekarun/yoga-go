import { NextResponse } from 'next/server';
import type { ApiResponse, Expert } from '@/types';
import { connectToDatabase } from '@/lib/mongodb';
import ExpertModel from '@/models/Expert';
import CourseModel from '@/models/Course';
import PaymentModel from '@/models/Payment';
import UserModel from '@/models/User';
import { getSession } from '@/lib/auth';

export async function GET() {
  console.log('[DBG][experts/route.ts] GET /data/experts called');

  try {
    await connectToDatabase();

    // Fetch all experts from MongoDB
    const expertDocs = await ExpertModel.find({}).lean().exec();

    // Calculate dynamic stats for each expert
    const expertsWithStats = await Promise.all(
      expertDocs.map(async (doc: any) => {
        const expertId = doc._id as string;

        // Get actual number of published courses
        const totalCourses = await CourseModel.countDocuments({
          'instructor.id': expertId,
          status: 'PUBLISHED',
        });

        // Get all courses for this expert (for calculating students)
        const expertCourses = await CourseModel.find(
          {
            'instructor.id': expertId,
            status: 'PUBLISHED',
          },
          { _id: 1 }
        ).lean();

        const courseIds = expertCourses.map(c => c._id);

        // Get actual number of unique students (from successful payments)
        const totalStudents =
          courseIds.length > 0
            ? await PaymentModel.distinct('userId', {
                courseId: { $in: courseIds },
                status: 'succeeded',
              }).then(users => users.length)
            : 0;

        console.log(
          `[DBG][experts/route.ts] Expert ${(doc as any).name}: ${totalCourses} courses, ${totalStudents} students`
        );

        return {
          ...doc,
          id: expertId,
          totalCourses,
          totalStudents,
          // Ensure liveStreamingEnabled is always present (default to true if not set)
          liveStreamingEnabled: (doc as any).liveStreamingEnabled ?? true,
          totalLiveSessions: (doc as any).totalLiveSessions ?? 0,
          upcomingLiveSessions: (doc as any).upcomingLiveSessions ?? 0,
        };
      })
    );

    const response: ApiResponse<Expert[]> = {
      success: true,
      data: expertsWithStats,
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
    if (!session || !session.user) {
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

    await connectToDatabase();

    // Get user to link expert profile
    const userDoc = await UserModel.findOne({ auth0Id: session.user.sub }).exec();

    if (!userDoc) {
      console.log('[DBG][experts/route.ts] User not found');
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<Expert>, {
        status: 404,
      });
    }

    // Check if user already has an expert profile
    if (userDoc.expertProfile) {
      console.log('[DBG][experts/route.ts] User already has an expert profile');
      return NextResponse.json(
        {
          success: false,
          error: 'User already has an expert profile',
        } as ApiResponse<Expert>,
        { status: 409 }
      );
    }

    // Check if expert with this ID already exists
    const existingExpert = await ExpertModel.findById(body.id).exec();
    if (existingExpert) {
      // Check if this expert belongs to the current user (by userId)
      if (existingExpert.userId === userDoc._id) {
        // Expert exists and belongs to this user - link it and return success
        console.log('[DBG][experts/route.ts] Expert exists for this user, re-linking');
        userDoc.role = 'expert';
        userDoc.expertProfile = existingExpert._id as string;
        await userDoc.save();

        const expert: Expert = {
          ...existingExpert.toObject(),
          id: existingExpert._id as string,
        };

        return NextResponse.json(
          {
            success: true,
            data: expert,
            message: 'Expert profile re-linked successfully',
          } as ApiResponse<Expert>,
          { status: 200 }
        );
      }

      // Expert exists but belongs to a different user
      const response: ApiResponse<Expert> = {
        success: false,
        error: 'Expert with this ID already exists',
      };
      return NextResponse.json(response, { status: 409 });
    }

    // Create new expert with defaults
    const newExpertData = {
      _id: body.id,
      userId: userDoc._id, // Link to user account
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
      courses: body.courses || [],
      socialLinks: body.socialLinks || {},
      onboardingCompleted: true, // Mark as completed since they filled the form
    };

    const newExpert = new ExpertModel(newExpertData);
    await newExpert.save();

    console.log('[DBG][experts/route.ts] Expert created successfully:', newExpert._id);

    // Update user to set role to expert and link expert profile
    userDoc.role = 'expert';
    userDoc.expertProfile = newExpert._id as string;
    await userDoc.save();

    console.log('[DBG][experts/route.ts] User updated with expert profile');

    // Transform to Expert type for response
    const expert: Expert = {
      ...newExpert.toObject(),
      id: newExpert._id as string,
    };

    const response: ApiResponse<Expert> = {
      success: true,
      data: expert,
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
