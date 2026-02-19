/**
 * DynamoDB Client Configuration for CallyGo
 *
 * Single-table design using 'cally-main' table:
 *
 * Key Patterns:
 * - Tenant: PK=TENANT#{tenantId}, SK=META
 * - User lookup: GSI1PK=USER#{cognitoSub}, GSI1SK=TENANT#{tenantId}
 *
 * GSIs:
 * - GSI1: Inverted lookups (cognitoSub → tenant)
 * - GSI2: Time-based queries
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

// Create document client with marshalling options
export const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

console.log(
  "[DBG][dynamodb] DynamoDB client initialized for region:",
  process.env.AWS_REGION || "ap-southeast-2",
);

// Table names
export const Tables = {
  CORE: "cally-main",
  // Use yoga-go-emails for email storage (shared with yoga for SES Lambda compatibility)
  EMAILS: "yoga-go-emails",
  // Use yoga-go-core for domain lookups (shared with yoga for SES Lambda compatibility)
  YOGA_CORE: "yoga-go-core",
} as const;

console.log("[DBG][dynamodb] Tables:", Tables);

// GSI names
export const Indexes = {
  GSI1: "GSI1",
  GSI2: "GSI2",
} as const;

// ============================================
// PK/SK Prefixes for Tenant entity
// ============================================

export const TenantPK = {
  // Tenant: PK=TENANT#{tenantId}, SK=META
  TENANT: (tenantId: string) => `TENANT#${tenantId}`,
  META: "META",

  // GSI1 for user lookup: GSI1PK=USER#{cognitoSub}, GSI1SK=TENANT#{tenantId}
  USER_GSI1PK: (cognitoSub: string) => `USER#${cognitoSub}`,
  TENANT_GSI1SK: (tenantId: string) => `TENANT#${tenantId}`,

  // Calendar Events: PK=TENANT#{tenantId}, SK=CALEVENT#{date}#{eventId}
  CALENDAR_EVENT: (date: string, eventId: string) =>
    `CALEVENT#${date}#${eventId}`,
  CALENDAR_EVENT_PREFIX: "CALEVENT#",

  // Subscribers: PK=TENANT#{tenantId}, SK=SUBSCRIBER#EMAIL#{normalizedEmail}
  SUBSCRIBER_EMAIL: (email: string) =>
    `SUBSCRIBER#EMAIL#${email.toLowerCase().trim()}`,
  SUBSCRIBER_EMAIL_PREFIX: "SUBSCRIBER#EMAIL#",

  // Contacts: PK=TENANT#{tenantId}, SK=CONTACT#{timestamp}#{contactId}
  CONTACT: (timestamp: string, contactId: string) =>
    `CONTACT#${timestamp}#${contactId}`,
  CONTACT_PREFIX: "CONTACT#",

  // Transcripts: PK=TENANT#{tenantId}, SK=TRANSCRIPT#{eventId}
  TRANSCRIPT: (eventId: string) => `TRANSCRIPT#${eventId}`,
  TRANSCRIPT_PREFIX: "TRANSCRIPT#",

  // Feedback: PK=TENANT#{tenantId}, SK=FEEDBACK#{timestamp}#{feedbackId}
  FEEDBACK: (timestamp: string, feedbackId: string) =>
    `FEEDBACK#${timestamp}#${feedbackId}`,
  FEEDBACK_PREFIX: "FEEDBACK#",

  // Surveys: PK=TENANT#{tenantId}, SK=SURVEY#{timestamp}#{surveyId}
  SURVEY: (timestamp: string, surveyId: string) =>
    `SURVEY#${timestamp}#${surveyId}`,
  SURVEY_PREFIX: "SURVEY#",

  // Survey Responses: PK=TENANT#{tenantId}, SK=SURVEYRESP#{surveyId}#{timestamp}#{responseId}
  SURVEY_RESPONSE: (surveyId: string, timestamp: string, responseId: string) =>
    `SURVEYRESP#${surveyId}#${timestamp}#${responseId}`,
  SURVEY_RESPONSE_PREFIX: (surveyId: string) => `SURVEYRESP#${surveyId}#`,

  // Products: PK=TENANT#{tenantId}, SK=PRODUCT#{productId}
  PRODUCT: (productId: string) => `PRODUCT#${productId}`,
  PRODUCT_PREFIX: "PRODUCT#",

  // Knowledge Docs: PK=TENANT#{tenantId}, SK=KNOWLEDGE#DOC#{docId}
  KNOWLEDGE_DOC: (docId: string) => `KNOWLEDGE#DOC#${docId}`,
  KNOWLEDGE_DOC_PREFIX: "KNOWLEDGE#DOC#",

  // Ad Campaigns: PK=TENANT#{tenantId}, SK=AD_CAMPAIGN#{campaignId}
  AD_CAMPAIGN: (campaignId: string) => `AD_CAMPAIGN#${campaignId}`,
  AD_CAMPAIGN_PREFIX: "AD_CAMPAIGN#",

  // Ad Credit: PK=TENANT#{tenantId}, SK=AD_CREDIT#META
  AD_CREDIT: "AD_CREDIT#META",

  // Ad Transactions: PK=TENANT#{tenantId}, SK=AD_TXN#{timestamp}#{txnId}
  AD_TRANSACTION: (timestamp: string, txnId: string) =>
    `AD_TXN#${timestamp}#${txnId}`,
  AD_TRANSACTION_PREFIX: "AD_TXN#",

  // Waitlist: PK=TENANT#{tenantId}, SK=WAITLIST#{date}#{entryId}
  WAITLIST: (date: string, entryId: string) => `WAITLIST#${date}#${entryId}`,
  WAITLIST_DATE_PREFIX: (date: string) => `WAITLIST#${date}#`,
  WAITLIST_PREFIX: "WAITLIST#",

  // Email Labels: PK=TENANT#{tenantId}, SK=EMAIL_LABEL#{labelId}
  EMAIL_LABEL: (labelId: string) => `EMAIL_LABEL#${labelId}`,
  EMAIL_LABEL_PREFIX: "EMAIL_LABEL#",
} as const;

// Entity type constants
export const EntityType = {
  TENANT: "TENANT",
  CALENDAR_EVENT: "CALENDAR_EVENT",
  EMAIL: "EMAIL",
  SUBSCRIBER: "SUBSCRIBER",
  CONTACT: "CONTACT",
  FEEDBACK: "FEEDBACK",
  TRANSCRIPT: "TRANSCRIPT",
  SURVEY: "SURVEY",
  SURVEY_RESPONSE: "SURVEY_RESPONSE",
  PRODUCT: "PRODUCT",
  KNOWLEDGE_DOC: "KNOWLEDGE_DOC",
  KNOWLEDGE_CHUNK: "KNOWLEDGE_CHUNK",
  AD_CAMPAIGN: "AD_CAMPAIGN",
  AD_CREDIT: "AD_CREDIT",
  AD_TRANSACTION: "AD_TRANSACTION",
  WAITLIST: "WAITLIST",
} as const;

// ============================================
// Knowledge Chunk PK/SK Prefixes (separate PK namespace for efficient retrieval)
// ============================================

export const KnowledgePK = {
  // Chunks: PK=KNOWLEDGE#{tenantId}, SK=CHUNK#{0000-padded-index}#{docId}
  CHUNKS: (tenantId: string) => `KNOWLEDGE#${tenantId}`,
  CHUNK: (chunkIndex: number, docId: string) =>
    `CHUNK#${String(chunkIndex).padStart(4, "0")}#${docId}`,
  CHUNK_PREFIX: "CHUNK#",
  CHUNK_DOC_SUFFIX: (docId: string) => `#${docId}`,
} as const;

// ============================================
// Email PK/SK Prefixes (stored in yoga-go-emails for SES Lambda compatibility)
// Uses same pattern as yoga app for seamless email receiving
// ============================================
export const EmailPK = {
  // Inbox by owner: PK=INBOX#{ownerId}, SK={receivedAt}#{emailId}
  // ownerId is tenantId for cally (matches expertId pattern in yoga)
  INBOX: (ownerId: string) => `INBOX#${ownerId}`,
  // AI assistant inbox: PK=INBOX#CAL#{ownerId}, SK={receivedAt}#{emailId}
  CAL_INBOX: (ownerId: string) => `INBOX#CAL#${ownerId}`,
  // Thread grouping: PK=THREAD#{threadId}, SK={emailId}
  THREAD: (threadId: string) => `THREAD#${threadId}`,
  // Drafts: PK=DRAFT#{ownerId}, SK=#{draftId}
  DRAFT: (ownerId: string) => `DRAFT#${ownerId}`,
} as const;

// ============================================
// Domain lookup PK/SK Prefixes (stored in yoga-go-core for SES Lambda)
// This allows the shared email forwarder Lambda to find cally tenants
// ============================================
export const DomainLookupPK = {
  // Domain lookup: PK=TENANT#DOMAIN#{domain}, SK={domain}
  DOMAIN: (domain: string) => `TENANT#DOMAIN#${domain.toLowerCase()}`,
} as const;
