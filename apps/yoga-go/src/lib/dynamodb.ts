/**
 * DynamoDB Client Configuration
 *
 * 9-table design:
 *
 * 1. CORE TABLE - Main business entities
 *    - Expert, Course, Lesson, CourseProgress
 *    - Asset, Survey, SurveyResponse
 *
 * 2. USERS TABLE - User accounts (separate from core)
 *    - User profiles, enrollments, achievements
 *
 * 3. ORDERS TABLE - Payments
 *    - Payment (dual-write for user lookup and intent lookup)
 *
 * 4. ANALYTICS TABLE - Course analytics events
 *    - CourseAnalyticsEvent
 *
 * 5. DISCUSSIONS TABLE - Discussions and votes
 *    - Discussion, DiscussionVote (dual-write for efficient lookups)
 *
 * 6. BLOG TABLE - Blog posts, comments, and likes
 *    - BlogPost, BlogComment, BlogLike
 *
 * 7. BOOST TABLE - Wallet and boost campaigns
 *    - ExpertWallet, WalletTransaction, Boost
 *
 * 8. ASSETS TABLE - Cloudflare uploaded images/videos
 *    - Asset metadata
 *
 * 9. EMAILS TABLE - Expert/Admin inboxes
 *    - Email, EmailThread (high-volume, separate table)
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
  USERS: 'yoga-go-users', // User accounts (separate from core)
  ORDERS: 'yoga-go-orders',
  ANALYTICS: 'yoga-go-analytics',
  DISCUSSIONS: 'yoga-go-discussions',
  BLOG: 'yoga-go-blog',
  ASSETS: 'yoga-go-assets',
  BOOST: 'yoga-go-boost', // Wallet and boost campaigns
  EMAILS: 'yoga-go-emails', // Expert/Admin inboxes
} as const;

// Legacy export for backward compatibility during migration
export const TABLE_NAME = Tables.CORE;

// ============================================
// CORE TABLE - Tenant-Partitioned Design
// ============================================
// All tenant-scoped entities use PK=TENANT#{tenantId}
// SYSTEM tenant (TENANT#SYSTEM) for platform-wide data:
//   - Domain lookups, Zoom email lookups, Exchange rates, Waitlist
// GSI1 for reverse lookups (entity → tenant)

export const CorePK = {
  // ============================================
  // TENANT PARTITION KEY (PK = TENANT#{tenantId})
  // ============================================
  TENANT: (tenantId: string) => `TENANT#${tenantId}`,

  // ============================================
  // SORT KEYS FOR TENANT-SCOPED ENTITIES
  // ============================================
  // Tenant metadata: PK=TENANT#{tenantId}, SK=META
  TENANT_META: 'META',

  // Course: PK=TENANT#{tenantId}, SK=COURSE#{courseId}
  COURSE: (courseId: string) => `COURSE#${courseId}`,

  // Lesson: PK=TENANT#{tenantId}, SK=LESSON#{courseId}#{lessonId}
  LESSON: (courseId: string, lessonId: string) => `LESSON#${courseId}#${lessonId}`,

  // Webinar: PK=TENANT#{tenantId}, SK=WEBINAR#{webinarId}
  WEBINAR: (webinarId: string) => `WEBINAR#${webinarId}`,

  // TenantUser: PK=TENANT#{tenantId}, SK=USER#{cognitoSub}
  TENANT_USER: (cognitoSub: string) => `USER#${cognitoSub}`,

  // Progress: PK=TENANT#{tenantId}, SK=PROGRESS#{userId}#{courseId}
  PROGRESS: (userId: string, courseId: string) => `PROGRESS#${userId}#${courseId}`,

  // Survey: PK=TENANT#{tenantId}, SK=SURVEY#{surveyId}
  SURVEY: (surveyId: string) => `SURVEY#${surveyId}`,

  // SurveyResponse: PK=TENANT#{tenantId}, SK=SURVEYRESP#{surveyId}#{responseId}
  SURVEY_RESPONSE: (surveyId: string, responseId: string) => `SURVEYRESP#${surveyId}#${responseId}`,

  // WebinarRegistration: PK=TENANT#{tenantId}, SK=WEBREG#{webinarId}#{registrationId}
  WEBINAR_REGISTRATION_SK: (webinarId: string, registrationId: string) =>
    `WEBREG#${webinarId}#${registrationId}`,

  // Recording: PK=TENANT#{tenantId}, SK=RECORDING#{recordingId}
  RECORDING: (recordingId: string) => `RECORDING#${recordingId}`,

  // OAuth tokens: PK=TENANT#{tenantId}, SK=GOOGLE_AUTH or ZOOM_AUTH
  GOOGLE_AUTH: 'GOOGLE_AUTH',
  ZOOM_AUTH: 'ZOOM_AUTH',

  // ============================================
  // SYSTEM TENANT (Platform-wide data)
  // PK=TENANT#SYSTEM
  // ============================================
  SYSTEM: 'TENANT#SYSTEM',

  // Exchange rate: PK=TENANT#SYSTEM, SK=EXCHANGERATE#{currency}
  EXCHANGE_RATE_SK: (currency: string) => `EXCHANGERATE#${currency}`,

  // Waitlist: PK=TENANT#SYSTEM, SK=WAITLIST#{timestamp}#{email}
  WAITLIST_SK: (timestamp: string, email: string) => `WAITLIST#${timestamp}#${email}`,

  // Waitlist pending: PK=TENANT#SYSTEM, SK=WAITLIST_PENDING#{email}
  WAITLIST_PENDING_SK: (email: string) => `WAITLIST_PENDING#${email.toLowerCase()}`,

  // Domain lookup: PK=TENANT#SYSTEM, SK=DOMAIN#{domain}
  // Maps custom domain to tenantId for routing
  DOMAIN_SK: (domain: string) => `DOMAIN#${domain.toLowerCase()}`,

  // Zoom email lookup: PK=TENANT#SYSTEM, SK=ZOOM_EMAIL#{email}
  // Maps Zoom account email to tenantId for webhook routing
  ZOOM_EMAIL_SK: (email: string) => `ZOOM_EMAIL#${email.toLowerCase()}`,

  // ============================================
  // BACKWARD COMPATIBILITY ALIASES
  // These maintain the old API while we migrate repositories
  // TODO: Remove these after all repositories are updated
  // ============================================

  /** @deprecated Use DOMAIN(domain) instead */
  TENANT_DOMAIN: (domain: string) => `TENANT#DOMAIN#${domain}`,

  /** @deprecated Use TENANT(tenantId) + TENANT_USER(cognitoSub) */
  USER: 'USER',

  /** @deprecated Use TENANT(tenantId) + PROGRESS(userId, courseId) */
  PROGRESS_LEGACY: (userId: string) => `PROGRESS#${userId}`,

  /** @deprecated Use TENANT(tenantId) + LESSON(courseId, lessonId) */
  LESSON_LEGACY: (courseId: string) => `LESSON#${courseId}`,

  /** @deprecated Use TENANT(tenantId) + SURVEY(surveyId) */
  SURVEY_LEGACY: (expertId: string) => `SURVEY#${expertId}`,

  /** @deprecated Use TENANT(tenantId) + SURVEY_RESPONSE(surveyId, responseId) */
  SURVEY_RESPONSE_LEGACY: (surveyId: string) => `RESP#${surveyId}`,

  /** @deprecated Use TENANT(tenantId) + WEBINAR_REGISTRATION_SK(webinarId, regId) */
  WEBINAR_REGISTRATION: (webinarId: string) => `REG#${webinarId}`,

  /** @deprecated Use TENANT(tenantId) + ... */
  WEBINAR_BY_EXPERT: (expertId: string) => `WEBINAR#EXPERT#${expertId}`,
  USER_REGISTRATIONS: (userId: string) => `USERREG#${userId}`,

  /** @deprecated For instructor lookup - will be removed */
  INSTRUCTOR: (instructorId: string) => `INSTRUCTOR#${instructorId}`,

  // Old static PK values - used by existing code until migrated
  /** @deprecated Use TENANT(tenantId) + TENANT_META */
  TENANT_STATIC: 'TENANT',
  /** @deprecated Use TENANT(tenantId) + TENANT_META - alias for backward compat */
  EXPERT: 'TENANT',
  /** @deprecated Use TENANT(tenantId) + COURSE(courseId) */
  COURSE_STATIC: 'COURSE',
  /** @deprecated Use TENANT(tenantId) + WEBINAR(webinarId) */
  WEBINAR_STATIC: 'WEBINAR',
  /** @deprecated Use SYSTEM + WAITLIST_SK(timestamp, email) - old static key */
  WAITLIST: 'WAITLIST',
  /** @deprecated Use SYSTEM + WAITLIST_PENDING_SK(email) - old function */
  WAITLIST_PENDING: (email: string) => `WAITLIST_PENDING#${email.toLowerCase()}`,
  /** @deprecated Use SYSTEM + EXCHANGE_RATE_SK(currency) - old static key */
  EXCHANGE_RATE: 'EXCHANGE_RATE',
  /** @deprecated Use TENANT(tenantId) + GOOGLE_AUTH - old static key */
  GOOGLE_AUTH_STATIC: 'GOOGLE_AUTH',
  /** @deprecated Use TENANT(tenantId) + ZOOM_AUTH - old static key */
  ZOOM_AUTH_STATIC: 'ZOOM_AUTH',
  /** @deprecated Use TENANT(tenantId) + LESSON(courseId, lessonId) - old function */
  LESSON_STATIC: (courseId: string) => `LESSON#${courseId}`,
  /** @deprecated Use TENANT(tenantId) + PROGRESS(userId, courseId) - old function */
  PROGRESS_STATIC: (userId: string) => `PROGRESS#${userId}`,
  /** @deprecated Discussion - kept for reference */
  DISCUSSION: (courseId: string) => `DISC#${courseId}`,
  /** @deprecated Vote - kept for reference */
  VOTE: (discussionId: string) => `VOTE#${discussionId}`,
  /** @deprecated Asset - kept for reference */
  ASSET: 'ASSET',
} as const;

// ============================================
// EMAILS TABLE - PK/SK Prefixes
// Separate table for high-volume email storage
// ============================================
export const EmailsPK = {
  // Inbox by owner: PK=INBOX#{ownerId}, SK={receivedAt}#{emailId}
  // ownerId is either expertId or 'ADMIN' for admin inbox
  INBOX: (ownerId: string) => `INBOX#${ownerId}`,
  // Thread grouping: PK=THREAD#{threadId}, SK={emailId}
  THREAD: (threadId: string) => `THREAD#${threadId}`,
  // GSI1 for unread filtering (optional optimization)
  // GSI1PK: INBOX#{ownerId}#UNREAD, GSI1SK: {receivedAt}
} as const;

// ============================================
// USERS TABLE - PK/SK Prefixes
// Separate table for user accounts
// ============================================
export const UsersPK = {
  // User profile: PK={cognitoSub}, SK=PROFILE
  USER: (cognitoSub: string) => cognitoSub,
  PROFILE: 'PROFILE',
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

// ============================================
// BOOST TABLE - PK/SK Prefixes
// Wallet and boost campaign management
// ============================================
export const BoostPK = {
  // Wallet: PK=WALLET#{expertId}, SK=META
  WALLET: (expertId: string) => `WALLET#${expertId}`,
  // Wallet transactions by expert: PK=WALLET#{expertId}, SK=TXN#{createdAt}#{txnId}
  // (stored in same partition as wallet for efficient querying)

  // Transaction direct lookup: PK=TXN#{txnId}, SK=META
  TRANSACTION: (txnId: string) => `TXN#${txnId}`,

  // Boosts by expert: PK=EXPERT#{expertId}, SK=BOOST#{createdAt}#{boostId}
  EXPERT: (expertId: string) => `EXPERT#${expertId}`,
  // Boost direct lookup: PK=BOOST#{boostId}, SK=META
  BOOST: (boostId: string) => `BOOST#${boostId}`,
  // Active boosts (for cron sync): GSI1PK=STATUS#{status}, GSI1SK={createdAt}#{boostId}
} as const;

// Legacy EntityType export for backward compatibility
// NOTE: EXPERT is now an alias for TENANT (consolidated entity)
export const EntityType = {
  USER: 'USER',
  EXPERT: 'TENANT', // Consolidated into TENANT
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
  WAITLIST: 'WAITLIST',
  WAITLIST_PENDING: 'WAITLIST_PENDING',
  // Boost entities
  WALLET: 'WALLET',
  WALLET_TRANSACTION: 'WALLET_TRANSACTION',
  BOOST: 'BOOST',
  // Currency entities
  EXCHANGE_RATE: 'EXCHANGE_RATE',
} as const;

export type EntityTypeValue = (typeof EntityType)[keyof typeof EntityType];

console.log(
  '[DBG][dynamodb] DynamoDB client initialized for region:',
  process.env.AWS_REGION || 'ap-southeast-2'
);
console.log('[DBG][dynamodb] Tables:', Tables);
