/**
 * DynamoDB Client Configuration
 *
 * 5-table design:
 *
 * 1. CORE TABLE - Main business entities
 *    - User, Expert, Course, Lesson, CourseProgress
 *    - Asset, Survey, SurveyResponse
 *
 * 2. CALENDAR TABLE - Scheduling & live sessions
 *    - LiveSession, LiveSessionParticipant, Availability
 *
 * 3. ORDERS TABLE - Payments
 *    - Payment (dual-write for user lookup and intent lookup)
 *
 * 4. ANALYTICS TABLE - Course analytics events
 *    - CourseAnalyticsEvent
 *
 * 5. DISCUSSIONS TABLE - Discussions and votes
 *    - Discussion, DiscussionVote (dual-write for efficient lookups)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Create base DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
});

// Create document client for easier JSON handling
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true, // Don't store undefined values
    convertEmptyValues: false, // Keep empty strings as empty strings
  },
  unmarshallOptions: {
    wrapNumbers: false, // Return numbers as JavaScript numbers
  },
});

// Table names from environment variables (with defaults for local dev)
export const Tables = {
  CORE: process.env.DYNAMODB_TABLE_CORE || 'core',
  CALENDAR: process.env.DYNAMODB_TABLE_CALENDAR || 'calendar',
  ORDERS: process.env.DYNAMODB_TABLE_ORDERS || 'orders',
  ANALYTICS: process.env.DYNAMODB_TABLE_ANALYTICS || 'analytics',
  DISCUSSIONS: process.env.DYNAMODB_TABLE_DISCUSSIONS || 'discussions',
} as const;

// Legacy export for backward compatibility during migration
export const TABLE_NAME = Tables.CORE;

// ============================================
// CORE TABLE - PK/SK Prefixes
// ============================================
export const CorePK = {
  USER: 'USER',
  EXPERT: 'EXPERT',
  COURSE: 'COURSE',
  LESSON: (courseId: string) => `LESSON#${courseId}`,
  PROGRESS: (userId: string) => `PROGRESS#${userId}`,
  DISCUSSION: (courseId: string) => `DISC#${courseId}`,
  VOTE: (discussionId: string) => `VOTE#${discussionId}`,
  ASSET: 'ASSET',
  SURVEY: (expertId: string) => `SURVEY#${expertId}`,
  SURVEY_RESPONSE: (surveyId: string) => `RESP#${surveyId}`,
  // GSI1 for courses by instructor
  INSTRUCTOR: (instructorId: string) => `INSTRUCTOR#${instructorId}`,
} as const;

// ============================================
// CALENDAR TABLE - PK/SK Prefixes
// ============================================
export const CalendarPK = {
  SESSION: 'SESSION', // Direct session lookup: PK=SESSION, SK={sessionId}
  EXPERT_SESSIONS: (expertId: string) => `EXPERT#${expertId}`, // Expert's sessions
  PARTICIPANTS: (sessionId: string) => `PARTICIPANTS#${sessionId}`, // Session participants
  ENROLLED: (userId: string) => `ENROLLED#${userId}`, // User's enrolled sessions
  AVAILABILITY: (expertId: string) => `AVAIL#${expertId}`, // Expert's availability
} as const;

// ============================================
// ORDERS TABLE - PK/SK Prefixes
// ============================================
export const OrdersPK = {
  USER_PAYMENTS: (userId: string) => `USER#${userId}`, // User's payments
  INTENT: (intentId: string) => `INTENT#${intentId}`, // Payment by intent ID
} as const;

// ============================================
// ANALYTICS TABLE - PK/SK Prefixes
// ============================================
export const AnalyticsPK = {
  COURSE: (courseId: string) => `COURSE#${courseId}`, // Course events
} as const;

// ============================================
// DISCUSSIONS TABLE - PK/SK Prefixes
// Dual-write pattern for efficient lookups
// ============================================
export const DiscussionsPK = {
  // Discussion access patterns
  COURSE: (courseId: string) => `COURSE#${courseId}`, // Discussions by course: PK=COURSE#{courseId}, SK=LESSON#{lessonId}#DISC#{discussionId}
  DISCUSSION: (discussionId: string) => `DISC#${discussionId}`, // Direct lookup: PK=DISC#{discussionId}, SK=META

  // Vote access patterns
  VOTES: (discussionId: string) => `VOTE#${discussionId}`, // Votes by discussion: PK=VOTE#{discussionId}, SK={userId}
  USER_VOTES: (userId: string) => `USERVOTE#${userId}`, // User's votes: PK=USERVOTE#{userId}, SK={discussionId}
} as const;

// Legacy EntityType export for backward compatibility
export const EntityType = {
  USER: 'USER',
  EXPERT: 'EXPERT',
  COURSE: 'COURSE',
  LESSON: 'LESSON',
  PROGRESS: 'PROGRESS',
  DISCUSSION: 'DISCUSSION',
  VOTE: 'VOTE',
  ASSET: 'ASSET',
  SURVEY: 'SURVEY',
  SURVEY_RESPONSE: 'SURVEY_RESPONSE',
  PAYMENT: 'PAYMENT',
  LIVE_SESSION: 'LIVE_SESSION',
  LIVE_PARTICIPANT: 'LIVE_PARTICIPANT',
  AVAILABILITY: 'AVAILABILITY',
  ANALYTICS_EVENT: 'ANALYTICS_EVENT',
} as const;

export type EntityTypeValue = (typeof EntityType)[keyof typeof EntityType];

console.log(
  '[DBG][dynamodb] DynamoDB client initialized for region:',
  process.env.AWS_REGION || 'ap-southeast-2'
);
console.log('[DBG][dynamodb] Tables:', Tables);
