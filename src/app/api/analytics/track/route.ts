import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import CourseAnalyticsEvent, {
  type EventType,
  type EventMetadata,
} from '@/models/CourseAnalyticsEvent';
import type { ApiResponse } from '@/types';
import { nanoid } from 'nanoid';

/**
 * POST /api/analytics/track
 * Track analytics events for courses and lessons
 *
 * Request body:
 * {
 *   eventType: 'course_view' | 'lesson_view' | 'video_play' | etc.,
 *   courseId: string,
 *   lessonId?: string,
 *   sessionId?: string,  // For anonymous tracking
 *   metadata?: { ... }
 * }
 */
export async function POST(request: Request) {
  console.log('[DBG][analytics/track] POST request received');

  try {
    // Parse request body
    const body = await request.json();
    const { eventType, courseId, lessonId, sessionId, metadata } = body;

    // Validate required fields
    if (!eventType || !courseId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'eventType and courseId are required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate eventType
    const validEventTypes: EventType[] = [
      'course_view',
      'course_preview',
      'lesson_view',
      'lesson_complete',
      'video_play',
      'video_pause',
      'video_complete',
      'video_progress',
      'subscription_click',
      'payment_modal_open',
      'enrollment_complete',
    ];

    if (!validEventTypes.includes(eventType as EventType)) {
      const response: ApiResponse<null> = {
        success: false,
        error: `Invalid eventType. Must be one of: ${validEventTypes.join(', ')}`,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get user ID if authenticated (optional)
    const session = await getSession();
    const userId = session?.user?.cognitoSub;

    // Validate session tracking - either userId or sessionId must be provided
    if (!userId && !sessionId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Either authenticated session or sessionId is required for tracking',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Connect to database
    await connectToDatabase();

    // Create event document
    const eventId = nanoid();
    const eventMetadata: EventMetadata = {
      ...metadata,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    const analyticsEvent = new CourseAnalyticsEvent({
      _id: eventId,
      eventType,
      courseId,
      lessonId: lessonId || undefined,
      userId: userId || undefined,
      sessionId: sessionId || undefined,
      timestamp: new Date(),
      metadata: eventMetadata,
    });

    await analyticsEvent.save();

    console.log('[DBG][analytics/track] Event saved:', eventType, courseId, lessonId);

    const response: ApiResponse<{ eventId: string }> = {
      success: true,
      data: { eventId },
      message: 'Event tracked successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][analytics/track] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to track event',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
