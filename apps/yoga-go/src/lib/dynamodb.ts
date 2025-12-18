/**
 * DynamoDB Client Configuration
 *
 * 5-table design:
 *
 * 1. CORE TABLE - Main business entities
 *    - User, Expert, Course, Lesson, CourseProgress
 *    - Asset, Survey, SurveyResponse
 *
 * 2. ORDERS TABLE - Payments
 *    - Payment (dual-write for user lookup and intent lookup)
 *
 * 3. ANALYTICS TABLE - Course analytics events
 *    - CourseAnalyticsEvent
 *
 * 4. DISCUSSIONS TABLE - Discussions and votes
 *    - Discussion, DiscussionVote (dual-write for efficient lookups)
 *
 * 5. BLOG TABLE - Blog posts, comments, and likes
 *    - BlogPost, BlogComment, BlogLike
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

// Table names - same for dev and prod
export const Tables = {
  CORE: 'yoga-go-core',
  ORDERS: 'yoga-go-orders',
  ANALYTICS: 'yoga-go-analytics',
  DISCUSSIONS: 'yoga-go-discussions',
  BLOG: 'yoga-go-blog',
  ASSETS: 'yoga-go-assets',
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
  // Tenant (multi-tenancy)
  TENANT: 'TENANT',
  TENANT_DOMAIN: (domain: string) => `TENANT#DOMAIN#${domain}`,
  // Webinar entities
  WEBINAR: 'WEBINAR',
  WEBINAR_REGISTRATION: (webinarId: string) => `REG#${webinarId}`,
  WEBINAR_BY_EXPERT: (expertId: string) => `WEBINAR#EXPERT#${expertId}`,
  USER_REGISTRATIONS: (userId: string) => `USERREG#${userId}`,
  // Expert Google OAuth
  GOOGLE_AUTH: 'GOOGLE_AUTH',
  // Expert Zoom OAuth
  ZOOM_AUTH: 'ZOOM_AUTH',
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

// ============================================
// BLOG TABLE - PK/SK Prefixes
// ============================================
export const BlogPK = {
  // Blog posts by expert: PK=EXPERT#{expertId}, SK=POST#{publishedAt}#{postId}
  EXPERT: (expertId: string) => `EXPERT#${expertId}`,
  // Direct post lookup: PK=POST#{postId}, SK=META
  POST: (postId: string) => `POST#${postId}`,
  // Comments by post: PK=COMMENTS#{postId}, SK={createdAt}#{commentId}
  COMMENTS: (postId: string) => `COMMENTS#${postId}`,
  // Likes by post: PK=LIKES#{postId}, SK={userId}
  LIKES: (postId: string) => `LIKES#${postId}`,
  // User's likes: PK=USERLIKES#{userId}, SK={postId}
  USER_LIKES: (userId: string) => `USERLIKES#${userId}`,
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
  ANALYTICS_EVENT: 'ANALYTICS_EVENT',
  TENANT: 'TENANT',
  BLOG_POST: 'BLOG_POST',
  BLOG_COMMENT: 'BLOG_COMMENT',
  BLOG_LIKE: 'BLOG_LIKE',
  // Webinar entities
  WEBINAR: 'WEBINAR',
  WEBINAR_REGISTRATION: 'WEBINAR_REGISTRATION',
  GOOGLE_AUTH: 'GOOGLE_AUTH',
  ZOOM_AUTH: 'ZOOM_AUTH',
} as const;

export type EntityTypeValue = (typeof EntityType)[keyof typeof EntityType];

console.log(
  '[DBG][dynamodb] DynamoDB client initialized for region:',
  process.env.AWS_REGION || 'ap-southeast-2'
);
console.log('[DBG][dynamodb] Tables:', Tables);
