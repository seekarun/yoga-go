import { NextResponse } from 'next/server';
import type { ApiResponse, Webinar } from '@/types';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import * as expertRepository from '@/lib/repositories/expertRepository';

interface RouteParams {
  params: Promise<{
    webinarId: string;
  }>;
}

/**
 * GET /data/webinars/[webinarId]
 * Returns webinar details (public view - no session links)
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { webinarId } = await params;
  console.log('[DBG][webinars/[webinarId]/route.ts] GET webinar:', webinarId);

  try {
    const webinar = await webinarRepository.getWebinarByIdOnly(webinarId);

    if (!webinar) {
      console.log('[DBG][webinars/[webinarId]/route.ts] Webinar not found:', webinarId);
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Webinar not found',
        },
        { status: 404 }
      );
    }

    // For public view, only show SCHEDULED, LIVE, or COMPLETED webinars
    if (webinar.status === 'DRAFT' || webinar.status === 'CANCELLED') {
      console.log('[DBG][webinars/[webinarId]/route.ts] Webinar not available:', webinar.status);
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: 'Webinar not available',
        },
        { status: 404 }
      );
    }

    // Fetch expert data
    const expert = await expertRepository.getExpertById(webinar.expertId);

    // Sanitize sessions for public view (remove Google Meet links)
    const sanitizedSessions = webinar.sessions.map(session => ({
      id: session.id,
      title: session.title,
      description: session.description,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      // Don't include googleMeetLink for public view
      // Don't include googleEventId
      // Include recording info only if ready
      recordingCloudflareId:
        session.recordingStatus === 'ready' ? session.recordingCloudflareId : undefined,
      recordingStatus: session.recordingStatus,
    }));

    // Build response with expert info
    const enrichedWebinar = {
      ...webinar,
      sessions: sanitizedSessions,
      expert: expert
        ? {
            id: expert.id,
            name: expert.name,
            title: expert.title,
            bio: expert.bio,
            avatar: expert.avatar,
            rating: expert.rating,
            totalCourses: expert.totalCourses,
            totalStudents: expert.totalStudents,
            specializations: expert.specializations,
          }
        : undefined,
    };

    const response: ApiResponse<typeof enrichedWebinar> = {
      success: true,
      data: enrichedWebinar,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][webinars/[webinarId]/route.ts] Error fetching webinar:', error);
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: 'Failed to fetch webinar',
      },
      { status: 500 }
    );
  }
}
