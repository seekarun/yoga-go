/**
 * Feedback Repository for Cally - DynamoDB Operations
 *
 * Storage pattern:
 * - PK="TENANT#{tenantId}", SK="FEEDBACK#{timestamp}#{feedbackId}"
 *
 * Queries:
 * - List all feedback: Query PK, SK begins_with "FEEDBACK#"
 * - Find by token: Query FEEDBACK# prefix, filter by token
 * - Approved feedback: Query FEEDBACK# prefix, filter by approved + consentToShowcase
 */

import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, TenantPK, EntityType } from "../dynamodb";
import type { FeedbackRequest } from "@/types";

/**
 * DynamoDB item type (includes PK/SK keys)
 */
interface DynamoDBFeedbackItem extends FeedbackRequest {
  PK: string;
  SK: string;
  entityType: string;
}

/**
 * Strip DynamoDB keys from item to return clean FeedbackRequest
 */
function toFeedback(item: DynamoDBFeedbackItem): FeedbackRequest {
  const { PK: _PK, SK: _SK, entityType: _entityType, ...feedback } = item;
  return feedback;
}

/**
 * Generate a short random ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Create a feedback request for a tenant
 */
export async function createFeedbackRequest(
  tenantId: string,
  data: {
    recipientEmail: string;
    recipientName: string;
    customMessage?: string;
    token: string;
  },
): Promise<FeedbackRequest> {
  const id = generateId();
  const createdAt = new Date().toISOString();

  console.log(
    `[DBG][feedbackRepository] Creating feedback request for ${data.recipientEmail} in tenant ${tenantId}`,
  );

  const feedback: FeedbackRequest = {
    id,
    tenantId,
    recipientEmail: data.recipientEmail,
    recipientName: data.recipientName,
    customMessage: data.customMessage,
    token: data.token,
    status: "pending",
    createdAt,
  };

  const item: DynamoDBFeedbackItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.FEEDBACK(createdAt, id),
    entityType: EntityType.FEEDBACK,
    ...feedback,
  };

  const command = new PutCommand({
    TableName: Tables.CORE,
    Item: item,
  });

  await docClient.send(command);
  console.log(
    `[DBG][feedbackRepository] Created feedback request ${id} for ${data.recipientEmail}`,
  );
  return feedback;
}

/**
 * Get all feedback for a tenant, sorted newest first
 */
export async function getFeedbackByTenant(
  tenantId: string,
): Promise<FeedbackRequest[]> {
  console.log(
    `[DBG][feedbackRepository] Getting all feedback for tenant ${tenantId}`,
  );

  const command = new QueryCommand({
    TableName: Tables.CORE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": TenantPK.TENANT(tenantId),
      ":skPrefix": TenantPK.FEEDBACK_PREFIX,
    },
    ScanIndexForward: false,
  });

  const result = await docClient.send(command);
  const items = (result.Items || []).map((item) =>
    toFeedback(item as DynamoDBFeedbackItem),
  );

  console.log(`[DBG][feedbackRepository] Found ${items.length} feedback items`);
  return items;
}

/**
 * Find a feedback request by token within a tenant
 * Scans all FEEDBACK items and filters — volume is low per tenant
 */
export async function getFeedbackByToken(
  tenantId: string,
  token: string,
): Promise<FeedbackRequest | null> {
  console.log(
    `[DBG][feedbackRepository] Looking up feedback by token for tenant ${tenantId}`,
  );

  const command = new QueryCommand({
    TableName: Tables.CORE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    FilterExpression: "#token = :token",
    ExpressionAttributeNames: {
      "#token": "token",
    },
    ExpressionAttributeValues: {
      ":pk": TenantPK.TENANT(tenantId),
      ":skPrefix": TenantPK.FEEDBACK_PREFIX,
      ":token": token,
    },
  });

  const result = await docClient.send(command);
  const items = result.Items || [];

  if (items.length === 0) {
    console.log(`[DBG][feedbackRepository] No feedback found for token`);
    return null;
  }

  return toFeedback(items[0] as DynamoDBFeedbackItem);
}

/**
 * Submit feedback (update pending request with rating/message/consent)
 */
export async function submitFeedback(
  tenantId: string,
  feedbackId: string,
  createdAt: string,
  data: {
    rating: number;
    message: string;
    consentToShowcase: boolean;
  },
): Promise<void> {
  console.log(
    `[DBG][feedbackRepository] Submitting feedback ${feedbackId} for tenant ${tenantId}`,
  );

  const command = new UpdateCommand({
    TableName: Tables.CORE,
    Key: {
      PK: TenantPK.TENANT(tenantId),
      SK: TenantPK.FEEDBACK(createdAt, feedbackId),
    },
    UpdateExpression:
      "SET #status = :status, submittedAt = :submittedAt, rating = :rating, message = :message, consentToShowcase = :consent",
    ExpressionAttributeNames: {
      "#status": "status",
    },
    ExpressionAttributeValues: {
      ":status": "submitted",
      ":submittedAt": new Date().toISOString(),
      ":rating": data.rating,
      ":message": data.message,
      ":consent": data.consentToShowcase,
    },
  });

  await docClient.send(command);
  console.log(
    `[DBG][feedbackRepository] Feedback ${feedbackId} submitted successfully`,
  );
}

/**
 * Approve feedback for landing page display
 */
export async function approveFeedback(
  tenantId: string,
  feedbackId: string,
  createdAt: string,
): Promise<void> {
  console.log(
    `[DBG][feedbackRepository] Approving feedback ${feedbackId} for tenant ${tenantId}`,
  );

  const command = new UpdateCommand({
    TableName: Tables.CORE,
    Key: {
      PK: TenantPK.TENANT(tenantId),
      SK: TenantPK.FEEDBACK(createdAt, feedbackId),
    },
    UpdateExpression: "SET approved = :approved, approvedAt = :approvedAt",
    ExpressionAttributeValues: {
      ":approved": true,
      ":approvedAt": new Date().toISOString(),
    },
  });

  await docClient.send(command);
  console.log(`[DBG][feedbackRepository] Feedback ${feedbackId} approved`);
}

/**
 * Revoke approval for feedback
 */
export async function revokeFeedback(
  tenantId: string,
  feedbackId: string,
  createdAt: string,
): Promise<void> {
  console.log(
    `[DBG][feedbackRepository] Revoking feedback ${feedbackId} for tenant ${tenantId}`,
  );

  const command = new UpdateCommand({
    TableName: Tables.CORE,
    Key: {
      PK: TenantPK.TENANT(tenantId),
      SK: TenantPK.FEEDBACK(createdAt, feedbackId),
    },
    UpdateExpression: "SET approved = :approved REMOVE approvedAt",
    ExpressionAttributeValues: {
      ":approved": false,
    },
  });

  await docClient.send(command);
  console.log(
    `[DBG][feedbackRepository] Feedback ${feedbackId} approval revoked`,
  );
}

/**
 * Record a reminder sent for a pending feedback request
 * Increments remindCount and sets lastRemindedAt
 */
export async function remindFeedback(
  tenantId: string,
  feedbackId: string,
  createdAt: string,
): Promise<void> {
  console.log(
    `[DBG][feedbackRepository] Recording remind for feedback ${feedbackId} in tenant ${tenantId}`,
  );

  const command = new UpdateCommand({
    TableName: Tables.CORE,
    Key: {
      PK: TenantPK.TENANT(tenantId),
      SK: TenantPK.FEEDBACK(createdAt, feedbackId),
    },
    UpdateExpression:
      "SET remindCount = if_not_exists(remindCount, :zero) + :one, lastRemindedAt = :now",
    ExpressionAttributeValues: {
      ":zero": 0,
      ":one": 1,
      ":now": new Date().toISOString(),
    },
  });

  await docClient.send(command);
  console.log(
    `[DBG][feedbackRepository] Remind recorded for feedback ${feedbackId}`,
  );
}

/**
 * Get approved feedback with consent for a tenant (for landing page testimonials)
 */
export async function getApprovedFeedback(
  tenantId: string,
): Promise<FeedbackRequest[]> {
  console.log(
    `[DBG][feedbackRepository] Getting approved feedback for tenant ${tenantId}`,
  );

  const command = new QueryCommand({
    TableName: Tables.CORE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    FilterExpression:
      "approved = :approved AND consentToShowcase = :consent AND #status = :status",
    ExpressionAttributeNames: {
      "#status": "status",
    },
    ExpressionAttributeValues: {
      ":pk": TenantPK.TENANT(tenantId),
      ":skPrefix": TenantPK.FEEDBACK_PREFIX,
      ":approved": true,
      ":consent": true,
      ":status": "submitted",
    },
    ScanIndexForward: false,
  });

  const result = await docClient.send(command);
  const items = (result.Items || []).map((item) =>
    toFeedback(item as DynamoDBFeedbackItem),
  );

  console.log(
    `[DBG][feedbackRepository] Found ${items.length} approved feedback items`,
  );
  return items;
}
