/**
 * DynamoDB Client Configuration for Calel
 *
 * Single-table design:
 *
 * CALEL-CORE TABLE - All business entities
 * - Tenant, Host, Availability, DateOverride, EventType, Booking, Webhook
 *
 * Key Patterns:
 * - Tenant: PK=TENANT, SK={tenantId}
 * - Host: PK=HOST#{tenantId}, SK={hostId}
 * - Availability: PK=AVAIL#{hostId}, SK={scheduleId}
 * - DateOverride: PK=OVERRIDE#{hostId}, SK={date}
 * - EventType: PK=EVENTTYPE#{hostId}, SK={eventTypeId}
 * - Booking: PK=BOOKING#HOST#{hostId}, SK={startTime}#{bookingId}
 * - Webhook: PK=WEBHOOK#{tenantId}, SK={webhookId}
 *
 * GSI1 - Inverted lookups:
 * - API Key → Tenant: GSI1PK=APIKEY#{prefix}
 * - Email → Host: GSI1PK=HOST#EMAIL#{email}
 * - External User → Host: GSI1PK=HOST#EXTERNAL#{externalUserId}
 *
 * GSI2 - Time-based queries:
 * - Tenant bookings by date: GSI2PK=BOOKING#TENANT#{tenantId}, GSI2SK={startTime}
 * - Event type by slug: GSI2PK=EVENTTYPE#SLUG#{hostSlug}#{slug}
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  }),
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
  CORE: "calel-core",
} as const;

console.log("[DBG][dynamodb] Tables:", Tables);

// GSI names
export const Indexes = {
  GSI1: "GSI1",
  GSI2: "GSI2",
} as const;

// ============================================
// PK/SK Prefixes for each entity type
// ============================================

export const TenantPK = {
  TENANT: "TENANT",
  API_KEY: (prefix: string) => `APIKEY#${prefix}`,
  SLUG: (slug: string) => `TENANT#SLUG#${slug}`,
} as const;

export const HostPK = {
  HOST: (tenantId: string) => `HOST#${tenantId}`,
  EMAIL: (email: string) => `HOST#EMAIL#${email}`,
  EXTERNAL: (externalUserId: string) => `HOST#EXTERNAL#${externalUserId}`,
  SLUG: (tenantSlug: string, hostSlug: string) =>
    `HOST#SLUG#${tenantSlug}#${hostSlug}`,
} as const;

export const AvailabilityPK = {
  AVAIL: (hostId: string) => `AVAIL#${hostId}`,
} as const;

export const OverridePK = {
  OVERRIDE: (hostId: string) => `OVERRIDE#${hostId}`,
} as const;

export const EventTypePK = {
  EVENTTYPE: (hostId: string) => `EVENTTYPE#${hostId}`,
  SLUG: (hostSlug: string, eventSlug: string) =>
    `EVENTTYPE#SLUG#${hostSlug}#${eventSlug}`,
  TENANT: (tenantId: string) => `EVENTTYPE#TENANT#${tenantId}`,
} as const;

export const BookingPK = {
  HOST: (hostId: string) => `BOOKING#HOST#${hostId}`,
  EMAIL: (email: string) => `BOOKING#EMAIL#${email}`,
  TENANT: (tenantId: string) => `BOOKING#TENANT#${tenantId}`,
} as const;

export const WebhookPK = {
  WEBHOOK: (tenantId: string) => `WEBHOOK#${tenantId}`,
} as const;

// Calendar Event key patterns
// PK=EVENT#HOST#{hostId}, SK={date}#{eventId}
export const CalendarEventPK = {
  HOST: (hostId: string) => `EVENT#HOST#${hostId}`,
} as const;

// Entity type constants for type field
export const EntityType = {
  TENANT: "TENANT",
  HOST: "HOST",
  AVAILABILITY: "AVAILABILITY",
  DATE_OVERRIDE: "DATE_OVERRIDE",
  EVENT_TYPE: "EVENT_TYPE",
  BOOKING: "BOOKING",
  WEBHOOK: "WEBHOOK",
  CALENDAR_EVENT: "CALENDAR_EVENT",
} as const;
