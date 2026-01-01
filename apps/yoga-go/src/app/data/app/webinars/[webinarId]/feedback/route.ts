/**
 * Webinar Feedback Route
 * POST /data/app/webinars/[webinarId]/feedback - Submit feedback
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import type { ApiResponse, Webinar, WebinarFeedback } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import * as webinarRegistrationRepository from '@/lib/repositories/webinarRegistrationRepository';

interface RouteParams {
  params: Promise<{
    webinarId: string;
  }>;
}

interface FeedbackInput {
  rating: number;
  comment: string;
}

/**
 * POST /data/app/webinars/[webinarId]/feedback
 * Submit feedback for a webinar (only for registered users)
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { webinarId } = await params;
  console.log('[DBG][webinar-feedback] POST called for:', webinarId);

  try {
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch webinar first to get tenantId
    const webinar = await webinarRepository.getWebinarByIdOnly(webinarId);
    if (!webinar) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Webinar not found' },
        { status: 404 }
      );
    }

    // Check if user is registered for this webinar
    const registration = await webinarRegistrationRepository.getRegistration(
      webinar.expertId,
      webinarId,
      user.id
    );

    if (!registration) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'You must be registered for this webinar to submit feedback' },
        { status: 403 }
      );
    }

    // Check if user has already submitted feedback
    if (registration.feedbackSubmitted) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'You have already submitted feedback for this webinar' },
        { status: 400 }
      );
    }

    // Parse and validate input
    const body: FeedbackInput = await request.json();

    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (!body.comment || body.comment.trim().length < 10) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Comment must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Create feedback
    const feedback: WebinarFeedback = {
      id: uuidv4(),
      userId: user.id,
      userName: user.profile.name || 'Anonymous',
      rating: body.rating,
      comment: body.comment.trim(),
      createdAt: new Date().toISOString(),
      status: 'published', // Auto-publish for now
    };

    // Add feedback to webinar
    const updatedWebinar = await webinarRepository.addFeedback(
      webinar.expertId,
      webinarId,
      feedback
    );

    // Mark feedback as submitted in registration
    await webinarRegistrationRepository.markFeedbackSubmitted(
      webinar.expertId,
      webinarId,
      user.id,
      registration.id
    );

    console.log('[DBG][webinar-feedback] Feedback submitted for webinar:', webinarId);

    return NextResponse.json<ApiResponse<Webinar>>({
      success: true,
      data: updatedWebinar,
      message: 'Thank you for your feedback!',
    });
  } catch (error) {
    console.error('[DBG][webinar-feedback] Error:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit feedback',
      },
      { status: 500 }
    );
  }
}
