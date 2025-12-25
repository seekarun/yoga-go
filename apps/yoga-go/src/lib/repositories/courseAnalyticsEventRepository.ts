/**
 * CourseAnalyticsEvent repository for DynamoDB operations
 * Handles CRUD operations for course analytics events
 *
 * 4-Table Design - ANALYTICS table:
 * - Course events: PK=COURSE#{courseId}, SK={timestamp}#{eventId}
 */

import { docClient, Tables, AnalyticsPK, EntityType } from '../dynamodb';
import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// Event types
export type EventType =
  | 'course_view'
  | 'course_preview'
  | 'lesson_view'
  | 'lesson_complete'
  | 'video_play'
  | 'video_pause'
  | 'video_complete'
  | 'video_progress'
  | 'enroll_click'
  | 'payment_modal_open'
  | 'enrollment_complete';

export interface EventMetadata {
  videoId?: string;
  videoDuration?: number;
  watchTime?: number;
  progressPercent?: number;
  userAgent?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  referrer?: string;
  paymentGateway?: 'stripe' | 'razorpay';
  paymentId?: string;
  amount?: number;
  currency?: string;
  [key: string]: unknown;
}

export interface CourseAnalyticsEvent {
  id: string;
  eventType: EventType;
  courseId: string;
  lessonId?: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  metadata?: EventMetadata;
  createdAt?: string;
  updatedAt?: string;
}

// Helper to generate a unique event ID
const generateEventId = () => `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

/**
 * Create a new analytics event
 * Simple time-series storage: PK=COURSE#{courseId}, SK={timestamp}#{eventId}
 */
export async function createAnalyticsEvent(
  input: Omit<CourseAnalyticsEvent, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CourseAnalyticsEvent> {
  console.log('[DBG][courseAnalyticsEventRepository] Creating event:', input.eventType);

  const now = new Date().toISOString();
  const eventId = generateEventId();
  const timestamp = input.timestamp || now;

  const event: CourseAnalyticsEvent = {
    ...input,
    id: eventId,
    timestamp,
    createdAt: now,
    updatedAt: now,
  };

  const item = {
    PK: AnalyticsPK.COURSE(input.courseId),
    SK: `${timestamp}#${eventId}`,
    entityType: EntityType.ANALYTICS_EVENT,
    ...event,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.ANALYTICS,
      Item: item,
    })
  );

  console.log('[DBG][courseAnalyticsEventRepository] Event created:', eventId);
  return event;
}

/**
 * Get events for a course within a date range
 */
export async function getEventsByCourse(
  courseId: string,
  startDate?: string,
  endDate?: string
): Promise<CourseAnalyticsEvent[]> {
  console.log('[DBG][courseAnalyticsEventRepository] Getting events for course:', courseId);

  let keyConditionExpression = 'PK = :pk';
  const expressionAttributeValues: Record<string, string> = {
    ':pk': AnalyticsPK.COURSE(courseId),
  };

  // Use SK range query if date range provided
  if (startDate && endDate) {
    keyConditionExpression += ' AND SK BETWEEN :start AND :end';
    expressionAttributeValues[':start'] = startDate;
    expressionAttributeValues[':end'] = `${endDate}\uffff`; // Include all events on endDate
  } else if (startDate) {
    keyConditionExpression += ' AND SK >= :start';
    expressionAttributeValues[':start'] = startDate;
  } else if (endDate) {
    keyConditionExpression += ' AND SK <= :end';
    expressionAttributeValues[':end'] = `${endDate}\uffff`;
  }

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.ANALYTICS,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: false, // Most recent first
    })
  );

  const events = (result.Items || []).map(mapToEvent);
  console.log('[DBG][courseAnalyticsEventRepository] Found', events.length, 'events');
  return events;
}

/**
 * Get events by course and event type
 * Note: Without GSI, this queries all events and filters by type
 */
export async function getEventsByCourseAndType(
  courseId: string,
  eventType: EventType,
  startDate?: string,
  endDate?: string
): Promise<CourseAnalyticsEvent[]> {
  console.log(
    '[DBG][courseAnalyticsEventRepository] Getting events for course:',
    courseId,
    'type:',
    eventType
  );

  // Get all events for the course in date range, then filter by type
  const allEvents = await getEventsByCourse(courseId, startDate, endDate);
  const events = allEvents.filter(e => e.eventType === eventType);

  console.log(
    '[DBG][courseAnalyticsEventRepository] Found',
    events.length,
    'events of type',
    eventType
  );
  return events;
}

/**
 * Count events by course and type
 */
export async function countEventsByCourseAndType(
  courseId: string,
  eventType: EventType,
  startDate?: string
): Promise<number> {
  const events = await getEventsByCourseAndType(courseId, eventType, startDate);
  return events.length;
}

/**
 * Get unique viewers (distinct userId + sessionId combinations)
 */
export async function getUniqueViewersByCourse(
  courseId: string,
  startDate?: string
): Promise<number> {
  const events = await getEventsByCourseAndType(courseId, 'course_view', startDate);

  const uniqueViewers = new Set<string>();
  for (const event of events) {
    const key = `${event.userId || 'anon'}_${event.sessionId || 'nosess'}`;
    uniqueViewers.add(key);
  }

  return uniqueViewers.size;
}

/**
 * Get events for a lesson
 * Note: Without GSI, this queries all course events and filters by lesson
 */
export async function getEventsByLesson(
  courseId: string,
  lessonId: string,
  eventType?: EventType,
  startDate?: string
): Promise<CourseAnalyticsEvent[]> {
  console.log('[DBG][courseAnalyticsEventRepository] Getting events for lesson:', lessonId);

  // Get all events for the course, then filter by lesson
  const allEvents = await getEventsByCourse(courseId, startDate);
  let events = allEvents.filter(e => e.lessonId === lessonId);

  if (eventType) {
    events = events.filter(e => e.eventType === eventType);
  }

  console.log('[DBG][courseAnalyticsEventRepository] Found', events.length, 'lesson events');
  return events;
}

/**
 * Get events by user
 * Note: Without GSI, this is not efficient. Consider if this access pattern is needed.
 */
export async function getEventsByUser(
  userId: string,
  courseId?: string,
  startDate?: string
): Promise<CourseAnalyticsEvent[]> {
  console.log('[DBG][courseAnalyticsEventRepository] Getting events for user:', userId);

  if (!courseId) {
    console.warn(
      '[DBG][courseAnalyticsEventRepository] getEventsByUser without courseId is not efficient'
    );
    return [];
  }

  // Get all events for the course, then filter by user
  const allEvents = await getEventsByCourse(courseId, startDate);
  const events = allEvents.filter(e => e.userId === userId);

  console.log('[DBG][courseAnalyticsEventRepository] Found', events.length, 'user events');
  return events;
}

/**
 * Calculate total watch time for a course
 */
export async function getTotalWatchTimeByCourse(
  courseId: string,
  startDate?: string
): Promise<number> {
  const events = await getEventsByCourseAndType(courseId, 'video_progress', startDate);

  let totalWatchTime = 0;
  for (const event of events) {
    if (event.metadata?.watchTime) {
      totalWatchTime += event.metadata.watchTime;
    }
  }

  return totalWatchTime;
}

/**
 * Get daily event counts for a course (for charting)
 */
export async function getDailyEventCountsByCourse(
  courseId: string,
  startDate: string,
  endDate?: string
): Promise<Array<{ date: string; eventType: EventType; count: number }>> {
  const events = await getEventsByCourse(courseId, startDate, endDate);

  const dailyCounts = new Map<string, Map<EventType, number>>();

  for (const event of events) {
    const date = event.timestamp.split('T')[0]; // Get date part only
    if (!dailyCounts.has(date)) {
      dailyCounts.set(date, new Map());
    }
    const dateMap = dailyCounts.get(date)!;
    dateMap.set(event.eventType, (dateMap.get(event.eventType) || 0) + 1);
  }

  const result: Array<{ date: string; eventType: EventType; count: number }> = [];
  for (const [date, counts] of dailyCounts) {
    for (const [eventType, count] of counts) {
      result.push({ date, eventType, count });
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get lesson engagement stats
 */
export async function getLessonEngagementStats(
  courseId: string,
  startDate?: string
): Promise<
  Array<{
    lessonId: string;
    views: number;
    completions: number;
    completionRate: number;
  }>
> {
  const allEvents = await getEventsByCourse(courseId, startDate);

  // Filter for lesson events only
  const lessonEvents = allEvents.filter(
    e => e.lessonId && (e.eventType === 'lesson_view' || e.eventType === 'lesson_complete')
  );

  // Group by lesson
  const lessonStats = new Map<string, { views: number; completions: number }>();

  for (const event of lessonEvents) {
    if (!event.lessonId) continue;

    if (!lessonStats.has(event.lessonId)) {
      lessonStats.set(event.lessonId, { views: 0, completions: 0 });
    }

    const stats = lessonStats.get(event.lessonId)!;
    if (event.eventType === 'lesson_view') {
      stats.views++;
    } else if (event.eventType === 'lesson_complete') {
      stats.completions++;
    }
  }

  const result = [];
  for (const [lessonId, stats] of lessonStats) {
    result.push({
      lessonId,
      views: stats.views,
      completions: stats.completions,
      completionRate: stats.views > 0 ? (stats.completions / stats.views) * 100 : 0,
    });
  }

  return result.sort((a, b) => b.views - a.views);
}

/**
 * Map DynamoDB item to CourseAnalyticsEvent type
 */
function mapToEvent(item: Record<string, unknown>): CourseAnalyticsEvent {
  return {
    id: item.id as string,
    eventType: item.eventType as EventType,
    courseId: item.courseId as string,
    lessonId: item.lessonId as string | undefined,
    userId: item.userId as string | undefined,
    sessionId: item.sessionId as string | undefined,
    timestamp: item.timestamp as string,
    metadata: item.metadata as EventMetadata | undefined,
    createdAt: item.createdAt as string | undefined,
    updatedAt: item.updatedAt as string | undefined,
  };
}

/**
 * Delete all analytics events for a user across specified courses
 * Note: Without a user GSI, this requires querying by course and filtering by userId
 * This is expensive but necessary for user deletion
 * Returns the count of deleted events
 */
export async function deleteAllByUser(userId: string, courseIds: string[]): Promise<number> {
  console.log('[DBG][courseAnalyticsEventRepository] Deleting all events for user:', userId);

  let totalDeleted = 0;

  for (const courseId of courseIds) {
    const events = await getEventsByCourse(courseId);

    // Filter events by this user
    const userEvents = events.filter(e => e.userId === userId);

    // Delete each event
    for (const event of userEvents) {
      await docClient.send(
        new DeleteCommand({
          TableName: Tables.ANALYTICS,
          Key: {
            PK: AnalyticsPK.COURSE(courseId),
            SK: `${event.timestamp}#${event.id}`,
          },
        })
      );
      totalDeleted++;
    }
  }

  console.log('[DBG][courseAnalyticsEventRepository] Deleted', totalDeleted, 'events');
  return totalDeleted;
}
