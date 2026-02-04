/**
 * DynamoDB Client Configuration for Cally
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

// Table name
export const Tables = {
  CORE: "cally-main",
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
} as const;

// Entity type constants
export const EntityType = {
  TENANT: "TENANT",
  CALENDAR_EVENT: "CALENDAR_EVENT",
} as const;
