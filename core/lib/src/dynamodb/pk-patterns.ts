/**
 * DynamoDB PK/SK Pattern Generators
 *
 * These patterns provide a consistent way to generate partition and sort keys
 * across all tables in the platform.
 */

/**
 * Core Table PK/SK Patterns
 * Tenant-partitioned design where all tenant-scoped entities use PK=TENANT#{tenantId}
 */
export const CorePK = {
  // ============================================
  // TENANT PARTITION KEY (PK = TENANT#{tenantId})
  // ============================================
  TENANT: (tenantId: string) => `TENANT#${tenantId}`,

  // ============================================
  // SORT KEYS FOR TENANT-SCOPED ENTITIES
  // ============================================
  TENANT_META: "META",
  COURSE: (courseId: string) => `COURSE#${courseId}`,
  LESSON: (courseId: string, lessonId: string) =>
    `LESSON#${courseId}#${lessonId}`,
  WEBINAR: (webinarId: string) => `WEBINAR#${webinarId}`,
  TENANT_USER: (cognitoSub: string) => `USER#${cognitoSub}`,
  PROGRESS: (userId: string, courseId: string) =>
    `PROGRESS#${userId}#${courseId}`,
  SURVEY: (surveyId: string) => `SURVEY#${surveyId}`,
  SURVEY_RESPONSE: (surveyId: string, responseId: string) =>
    `SURVEYRESP#${surveyId}#${responseId}`,
  WEBINAR_REGISTRATION_SK: (webinarId: string, registrationId: string) =>
    `WEBREG#${webinarId}#${registrationId}`,
  RECORDING: (recordingId: string) => `RECORDING#${recordingId}`,
  CALENDAR_EVENT: (date: string, eventId: string) =>
    `CALEVENT#${date}#${eventId}`,
  CALENDAR_EVENT_PREFIX: "CALEVENT#",
  GOOGLE_AUTH: "GOOGLE_AUTH",
  ZOOM_AUTH: "ZOOM_AUTH",

  // ============================================
  // SYSTEM TENANT (Platform-wide data)
  // ============================================
  SYSTEM: "TENANT#SYSTEM",
  EXCHANGE_RATE_SK: (currency: string) => `EXCHANGERATE#${currency}`,
  WAITLIST_SK: (timestamp: string, email: string) =>
    `WAITLIST#${timestamp}#${email}`,
  WAITLIST_PENDING_SK: (email: string) =>
    `WAITLIST_PENDING#${email.toLowerCase()}`,
  DOMAIN_SK: (domain: string) => `DOMAIN#${domain.toLowerCase()}`,
  ZOOM_EMAIL_SK: (email: string) => `ZOOM_EMAIL#${email.toLowerCase()}`,

  // ============================================
  // BACKWARD COMPATIBILITY ALIASES
  // ============================================
  /** @deprecated Use DOMAIN(domain) instead */
  TENANT_DOMAIN: (domain: string) => `TENANT#DOMAIN#${domain}`,
  /** @deprecated Use TENANT(tenantId) + TENANT_USER(cognitoSub) */
  USER: "USER",
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
  /** @deprecated */
  WEBINAR_BY_EXPERT: (expertId: string) => `WEBINAR#EXPERT#${expertId}`,
  USER_REGISTRATIONS: (userId: string) => `USERREG#${userId}`,
  /** @deprecated */
  INSTRUCTOR: (instructorId: string) => `INSTRUCTOR#${instructorId}`,
  /** @deprecated Use TENANT(tenantId) + TENANT_META */
  TENANT_STATIC: "TENANT",
  /** @deprecated Use TENANT(tenantId) + TENANT_META */
  EXPERT: "TENANT",
  /** @deprecated Use TENANT(tenantId) + COURSE(courseId) */
  COURSE_STATIC: "COURSE",
  /** @deprecated Use TENANT(tenantId) + WEBINAR(webinarId) */
  WEBINAR_STATIC: "WEBINAR",
  /** @deprecated */
  WAITLIST: "WAITLIST",
  /** @deprecated */
  WAITLIST_PENDING: (email: string) =>
    `WAITLIST_PENDING#${email.toLowerCase()}`,
  /** @deprecated */
  EXCHANGE_RATE: "EXCHANGE_RATE",
  /** @deprecated */
  GOOGLE_AUTH_STATIC: "GOOGLE_AUTH",
  /** @deprecated */
  ZOOM_AUTH_STATIC: "ZOOM_AUTH",
  /** @deprecated */
  LESSON_STATIC: (courseId: string) => `LESSON#${courseId}`,
  /** @deprecated */
  PROGRESS_STATIC: (userId: string) => `PROGRESS#${userId}`,
  /** @deprecated */
  DISCUSSION: (courseId: string) => `DISC#${courseId}`,
  /** @deprecated */
  VOTE: (discussionId: string) => `VOTE#${discussionId}`,
  /** @deprecated */
  ASSET: "ASSET",
} as const;

/**
 * Emails Table PK/SK Patterns
 */
export const EmailsPK = {
  INBOX: (ownerId: string) => `INBOX#${ownerId}`,
  THREAD: (threadId: string) => `THREAD#${threadId}`,
} as const;

/**
 * Users Table PK/SK Patterns
 */
export const UsersPK = {
  USER: (cognitoSub: string) => cognitoSub,
  PROFILE: "PROFILE",
} as const;

/**
 * Orders Table PK/SK Patterns
 */
export const OrdersPK = {
  USER_PAYMENTS: (userId: string) => `USER#${userId}`,
  INTENT: (intentId: string) => `INTENT#${intentId}`,
} as const;

/**
 * Analytics Table PK/SK Patterns
 */
export const AnalyticsPK = {
  COURSE: (courseId: string) => `COURSE#${courseId}`,
} as const;

/**
 * Discussions Table PK/SK Patterns
 */
export const DiscussionsPK = {
  COURSE: (courseId: string) => `COURSE#${courseId}`,
  DISCUSSION: (discussionId: string) => `DISC#${discussionId}`,
  VOTES: (discussionId: string) => `VOTE#${discussionId}`,
  USER_VOTES: (userId: string) => `USERVOTE#${userId}`,
} as const;

/**
 * Blog Table PK/SK Patterns
 */
export const BlogPK = {
  EXPERT: (expertId: string) => `EXPERT#${expertId}`,
  POST: (postId: string) => `POST#${postId}`,
  COMMENTS: (postId: string) => `COMMENTS#${postId}`,
  LIKES: (postId: string) => `LIKES#${postId}`,
  USER_LIKES: (userId: string) => `USERLIKES#${userId}`,
} as const;

/**
 * Forum PK/SK Patterns (uses DISCUSSIONS table)
 */
export const ForumPK = {
  TENANT: (expertId: string) => `TENANT#${expertId}`,
  THREAD_SK: (context: string, createdAt: string, threadId: string) =>
    `CTX#${context}#THREAD#${createdAt}#${threadId}`,
  REPLY_SK: (
    context: string,
    threadId: string,
    createdAt: string,
    replyId: string,
  ) => `CTX#${context}#THREAD#${threadId}#REPLY#${createdAt}#${replyId}`,
  LIKE_SK: (context: string, msgId: string, visitorId: string) =>
    `CTX#${context}#LIKE#${msgId}#${visitorId}`,
  CTX_PREFIX: (context: string) => `CTX#${context}#`,
  THREAD_PREFIX: (context: string) => `CTX#${context}#THREAD#`,
  THREAD_WITH_REPLIES_PREFIX: (context: string, threadId: string) =>
    `CTX#${context}#THREAD#${threadId}`,
  LIKE_PREFIX: (context: string, msgId: string) =>
    `CTX#${context}#LIKE#${msgId}#`,
  GSI1_SK: (createdAt: string, msgId: string) => `${createdAt}#${msgId}`,
} as const;

/**
 * Notification PK/SK Patterns (uses DISCUSSIONS table)
 */
export const NotificationPK = {
  RECIPIENT: (recipientId: string) => `TENANT#${recipientId}`,
  NOTIFICATION_SK: (createdAt: string, id: string) =>
    `NOTIF#${createdAt}#${id}`,
  NOTIFICATION_PREFIX: "NOTIF#",
} as const;

/**
 * Boost Table PK/SK Patterns
 */
export const BoostPK = {
  WALLET: (expertId: string) => `WALLET#${expertId}`,
  TRANSACTION: (txnId: string) => `TXN#${txnId}`,
  EXPERT: (expertId: string) => `EXPERT#${expertId}`,
  BOOST: (boostId: string) => `BOOST#${boostId}`,
} as const;
