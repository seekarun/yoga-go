import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type { ApiResponse, Expert, UserRole } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as userRepository from '@/lib/repositories/userRepository';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
import * as courseProgressRepository from '@/lib/repositories/courseProgressRepository';
import * as tenantRepository from '@/lib/repositories/tenantRepository';
import { addDomainToVercel } from '@/lib/vercel';
import { validateExpertIdWithAI } from '@/lib/reservedIds';

export async function GET() {
  console.log('[DBG][experts/route.ts] GET /data/experts called');

  try {
    // Check if request is from an expert subdomain/domain
    const headersList = await headers();
    const expertIdFromHeader = headersList.get('x-expert-id');
    const isExpertDomain = !!expertIdFromHeader;

    console.log(
      '[DBG][experts/route.ts] Expert domain:',
      isExpertDomain,
      'Expert ID:',
      expertIdFromHeader
    );

    // Fetch all experts from DynamoDB
    let expertDocs = await expertRepository.getAllExperts();

    // If on expert domain, only return that expert
    if (isExpertDomain && expertIdFromHeader) {
      expertDocs = expertDocs.filter(e => e.id === expertIdFromHeader);
      console.log('[DBG][experts/route.ts] Filtered to single expert');
    } else if (!isExpertDomain) {
      // On primary platform, filter by featuredOnPlatform
      const featuredExpertIds = new Set<string>();

      for (const expert of expertDocs) {
        const tenant = await tenantRepository.getTenantByExpertId(expert.id);
        // Include if no tenant (legacy) or if featuredOnPlatform is true
        if (!tenant || tenant.featuredOnPlatform) {
          featuredExpertIds.add(expert.id);
        }
      }

      expertDocs = expertDocs.filter(e => featuredExpertIds.has(e.id));
      console.log(
        '[DBG][experts/route.ts] Filtered to platform-featured experts:',
        expertDocs.length
      );
    }

    // Calculate dynamic stats for each expert
    const expertsWithStats = await Promise.all(
      expertDocs.map(async (doc: Expert) => {
        const expertId = doc.id;

        // Get published courses for this expert from DynamoDB
        const expertCourses = await courseRepository.getPublishedCoursesByInstructorId(expertId);
        const totalCourses = expertCourses.length;
        const courseIds = expertCourses.map(c => c.id);

        // Get actual number of unique students from course progress
        let totalStudents = 0;
        if (courseIds.length > 0) {
          const uniqueUserIds = new Set<string>();
          for (const courseId of courseIds) {
            const progressRecords = await courseProgressRepository.getCourseProgressByCourseId(
              expertId,
              courseId
            );
            progressRecords.forEach(p => uniqueUserIds.add(p.userId));
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
    // Check authentication - use cookie-based session for Vercel
    const session = await getSessionFromCookies();
    if (!session || !session.user || !session.user.cognitoSub) {
      console.log('[DBG][experts/route.ts] Unauthorized - no session');
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<Expert>, {
        status: 401,
      });
    }

    const body = await request.json();
    console.log('[DBG][experts/route.ts] Received expert data:', body);

    // Validate required fields (title, bio, avatar are now optional for simplified onboarding)
    const requiredFields = ['id', 'name'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      const response: ApiResponse<Expert> = {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate expert ID (check for reserved/blocked IDs + AI validation)
    const idValidation = await validateExpertIdWithAI(body.id);

    // Hard rejection - ID is blocked, cannot create account
    if (!idValidation.isValid && idValidation.hardRejection) {
      console.log('[DBG][experts/route.ts] Hard rejected expert ID:', body.id, idValidation.error);
      const response: ApiResponse<Expert> = {
        success: false,
        error: idValidation.error || 'This ID is not allowed. Please choose a different one.',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Track if flagged for review (will be set on expert record)
    const isFlaggedForReview = idValidation.flaggedForReview === true;
    if (isFlaggedForReview) {
      console.log(
        '[DBG][experts/route.ts] Expert ID flagged for review:',
        body.id,
        idValidation.flagReason
      );
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

    // Create new expert/tenant in DynamoDB (merged entity)
    const expertId = body.id;
    const subdomain = `${expertId}.myyoga.guru`;
    const featuredOnPlatform = body.platformPreferences?.featuredOnPlatform ?? true;

    const newExpert = await expertRepository.createExpert({
      id: expertId,
      userId: user.id, // Link to user account (cognitoSub)
      name: body.name,
      title: body.title || '',
      bio: body.bio || '',
      avatar: body.avatar || '',
      rating: body.rating || 0,
      totalCourses: body.totalCourses || 0,
      totalStudents: body.totalStudents || 0,
      specializations: body.specializations || [],
      featured: body.featured || false,
      certifications: body.certifications || [],
      experience: body.experience || '',
      socialLinks: body.socialLinks || {},
      onboardingCompleted: true, // Mark as completed since they filled the form
      // Save landing page to draft (not published) - expert must explicitly publish
      draftLandingPage: body.draftLandingPage || body.customLandingPage,
      isLandingPagePublished: body.isLandingPagePublished ?? false,
      // Expert ID review fields (set if AI flagged for review)
      flaggedForReview: isFlaggedForReview,
      flagReason: isFlaggedForReview ? idValidation.flagReason : undefined,
      flaggedAt: isFlaggedForReview ? new Date().toISOString() : undefined,
      reviewStatus: isFlaggedForReview ? 'pending' : undefined,
      platformPreferences: {
        featuredOnPlatform: featuredOnPlatform,
        defaultEmail: `${expertId}@myyoga.guru`,
        forwardingEmail: user.profile?.email, // Forward incoming emails to user's login email
        emailForwardingEnabled: true, // Enable forwarding by default
        ...body.platformPreferences, // Allow overrides from request body
      },
      // Domain fields (Expert and Tenant are now merged)
      primaryDomain: subdomain,
      additionalDomains: [],
      status: 'active',
    });

    console.log('[DBG][experts/route.ts] Expert/tenant created successfully:', newExpert.id);

    // Add subdomain to Vercel (non-blocking - don't fail if this fails)
    try {
      const vercelResult = await addDomainToVercel(subdomain);
      if (vercelResult.success) {
        console.log('[DBG][experts/route.ts] Subdomain added to Vercel:', subdomain);
      } else {
        console.warn(
          '[DBG][experts/route.ts] Failed to add subdomain to Vercel:',
          vercelResult.error
        );
      }
    } catch (vercelError) {
      console.error('[DBG][experts/route.ts] Error adding subdomain to Vercel:', vercelError);
      // Don't throw - expert is created, Vercel can be fixed manually
    }

    // Update user to set role to expert and link expert profile using userRepository
    const updatedRoles: UserRole[] = user.role.includes('expert')
      ? user.role
      : [...user.role, 'expert'];

    await userRepository.updateUser(session.user.cognitoSub, {
      role: updatedRoles,
      expertProfile: newExpert.id,
    });

    console.log('[DBG][experts/route.ts] User updated with expert profile');

    // Note: Welcome email is sent by DynamoDB stream Lambda (user-welcome-stream)
    // when the TENANT record is created above

    // Build response with warning if flagged
    const response: ApiResponse<Expert> & { warning?: string } = {
      success: true,
      data: newExpert,
      message: isFlaggedForReview
        ? 'Expert profile created. Your expert ID has been flagged for review.'
        : 'Expert created successfully',
    };

    // Add warning for flagged accounts
    if (isFlaggedForReview) {
      response.warning =
        'Your expert ID has been flagged for review. You can set up your profile, but you will not be able to publish your landing page until the review is complete.';
    }

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
