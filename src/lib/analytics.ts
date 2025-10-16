/**
 * Analytics tracking utilities
 * Provides functions to track events throughout the application
 */

import type { EventType, EventMetadata } from '@/models/CourseAnalyticsEvent';
import { nanoid } from 'nanoid';

// Get or create session ID from localStorage
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  const SESSION_KEY = 'yoga-go-session';
  let sessionId = localStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = nanoid();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

interface TrackEventParams {
  eventType: EventType;
  courseId: string;
  lessonId?: string;
  metadata?: EventMetadata;
}

/**
 * Track an analytics event
 */
export async function trackEvent(params: TrackEventParams): Promise<boolean> {
  try {
    const { eventType, courseId, lessonId, metadata } = params;
    const sessionId = getSessionId();

    console.log('[DBG][analytics] Tracking event:', eventType, courseId, lessonId);

    const response = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType,
        courseId,
        lessonId,
        sessionId,
        metadata,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      console.error('[DBG][analytics] Failed to track event:', data.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[DBG][analytics] Error tracking event:', error);
    return false;
  }
}

/**
 * Track course view event
 */
export async function trackCourseView(courseId: string): Promise<boolean> {
  return trackEvent({
    eventType: 'course_view',
    courseId,
  });
}

/**
 * Track course preview (promo video play)
 */
export async function trackCoursePreview(courseId: string): Promise<boolean> {
  return trackEvent({
    eventType: 'course_preview',
    courseId,
  });
}

/**
 * Track subscription button click
 */
export async function trackSubscriptionClick(courseId: string): Promise<boolean> {
  return trackEvent({
    eventType: 'subscription_click',
    courseId,
  });
}

/**
 * Track payment modal open
 */
export async function trackPaymentModalOpen(courseId: string): Promise<boolean> {
  return trackEvent({
    eventType: 'payment_modal_open',
    courseId,
  });
}

/**
 * Track enrollment complete
 */
export async function trackEnrollmentComplete(
  courseId: string,
  paymentId?: string
): Promise<boolean> {
  return trackEvent({
    eventType: 'enrollment_complete',
    courseId,
    metadata: {
      paymentId,
    },
  });
}

/**
 * Track lesson view
 */
export async function trackLessonView(courseId: string, lessonId: string): Promise<boolean> {
  return trackEvent({
    eventType: 'lesson_view',
    courseId,
    lessonId,
  });
}

/**
 * Track lesson complete
 */
export async function trackLessonComplete(courseId: string, lessonId: string): Promise<boolean> {
  return trackEvent({
    eventType: 'lesson_complete',
    courseId,
    lessonId,
  });
}

/**
 * Track video playback events
 */
export async function trackVideoPlay(
  courseId: string,
  lessonId: string,
  videoId: string
): Promise<boolean> {
  return trackEvent({
    eventType: 'video_play',
    courseId,
    lessonId,
    metadata: {
      videoId,
    },
  });
}

export async function trackVideoProgress(
  courseId: string,
  lessonId: string,
  videoId: string,
  watchTime: number,
  videoDuration: number
): Promise<boolean> {
  const progressPercent = (watchTime / videoDuration) * 100;

  return trackEvent({
    eventType: 'video_progress',
    courseId,
    lessonId,
    metadata: {
      videoId,
      watchTime,
      videoDuration,
      progressPercent,
    },
  });
}

export async function trackVideoComplete(
  courseId: string,
  lessonId: string,
  videoId: string,
  watchTime: number
): Promise<boolean> {
  return trackEvent({
    eventType: 'video_complete',
    courseId,
    lessonId,
    metadata: {
      videoId,
      watchTime,
    },
  });
}
