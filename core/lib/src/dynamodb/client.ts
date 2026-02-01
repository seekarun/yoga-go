/**
 * DynamoDB Client Configuration
 *
 * Provides a configurable DynamoDB document client that can be used by any vertical.
 * Each app configures its own table names and region settings.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * Configuration options for DynamoDB client
 */
export interface DynamoDBConfig {
  region?: string;
}

/**
 * Table name configuration interface
 * Each vertical can define its own table names
 */
export interface TableNames {
  CORE: string;
  USERS: string;
  ORDERS: string;
  ANALYTICS: string;
  DISCUSSIONS: string;
  BLOG: string;
  ASSETS: string;
  BOOST: string;
  EMAILS: string;
}

// Singleton client instance
let docClientInstance: DynamoDBDocumentClient | null = null;
let configuredRegion: string | null = null;

/**
 * Creates or returns the singleton DynamoDB Document Client
 */
export function getDocClient(config?: DynamoDBConfig): DynamoDBDocumentClient {
  const region = config?.region || process.env.AWS_REGION || "ap-southeast-2";

  // Return existing client if region matches
  if (docClientInstance && configuredRegion === region) {
    return docClientInstance;
  }

  // Create base DynamoDB client
  const client = new DynamoDBClient({ region });

  // Create document client for easier JSON handling
  docClientInstance = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertEmptyValues: false,
    },
    unmarshallOptions: {
      wrapNumbers: false,
    },
  });

  configuredRegion = region;

  console.log(
    "[DBG][dynamodb] DynamoDB client initialized for region:",
    region,
  );

  return docClientInstance;
}

/**
 * Entity types used across the platform
 */
export const EntityType = {
  USER: "USER",
  EXPERT: "TENANT",
  COURSE: "COURSE",
  LESSON: "LESSON",
  PROGRESS: "PROGRESS",
  DISCUSSION: "DISCUSSION",
  VOTE: "VOTE",
  ASSET: "ASSET",
  SURVEY: "SURVEY",
  SURVEY_RESPONSE: "SURVEY_RESPONSE",
  PAYMENT: "PAYMENT",
  ANALYTICS_EVENT: "ANALYTICS_EVENT",
  TENANT: "TENANT",
  BLOG_POST: "BLOG_POST",
  BLOG_COMMENT: "BLOG_COMMENT",
  BLOG_LIKE: "BLOG_LIKE",
  WEBINAR: "WEBINAR",
  WEBINAR_REGISTRATION: "WEBINAR_REGISTRATION",
  GOOGLE_AUTH: "GOOGLE_AUTH",
  ZOOM_AUTH: "ZOOM_AUTH",
  WAITLIST: "WAITLIST",
  WAITLIST_PENDING: "WAITLIST_PENDING",
  WALLET: "WALLET",
  WALLET_TRANSACTION: "WALLET_TRANSACTION",
  BOOST: "BOOST",
  EXCHANGE_RATE: "EXCHANGE_RATE",
  FORUM_THREAD: "FORUM_THREAD",
  FORUM_REPLY: "FORUM_REPLY",
  FORUM_LIKE: "FORUM_LIKE",
  NOTIFICATION: "NOTIFICATION",
  CALENDAR_EVENT: "CALENDAR_EVENT",
  RECORDING: "RECORDING",
  EMAIL: "EMAIL",
} as const;

export type EntityTypeValue = (typeof EntityType)[keyof typeof EntityType];
