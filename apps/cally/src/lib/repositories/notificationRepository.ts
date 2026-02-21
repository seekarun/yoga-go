/**
 * Notification Repository
 *
 * Handles CRUD operations for real-time notifications.
 * Storage: cally-main table
 * PK: TENANT#{tenantId}
 * SK: NOTIF#{createdAt}#{notificationId}
 */

import { QueryCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { docClient, Tables, TenantPK, EntityType } from "@/lib/dynamodb";
import type { CallyNotification, CallyNotificationType } from "@/types";

export interface CreateNotificationInput {
  recipientId: string;
  type: CallyNotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationFilters {
  unreadOnly?: boolean;
  limit?: number;
  lastKey?: string;
}

export interface NotificationListResult {
  notifications: CallyNotification[];
  unreadCount: number;
  lastKey?: string;
}

/**
 * Create a new notification
 */
export async function createNotification(
  tenantId: string,
  input: CreateNotificationInput,
): Promise<CallyNotification> {
  const now = new Date().toISOString();
  const id = uuidv4();

  const notification: CallyNotification = {
    id,
    recipientId: input.recipientId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link,
    isRead: false,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.NOTIFICATION(now, id),
        EntityType: EntityType.NOTIFICATION,
        ...notification,
      },
    }),
  );

  console.log(
    "[DBG][notificationRepo] Created notification:",
    id,
    "for tenant:",
    tenantId,
  );
  return notification;
}

/**
 * Get notifications for a tenant
 */
export async function getNotifications(
  tenantId: string,
  filters: NotificationFilters = {},
): Promise<NotificationListResult> {
  const { unreadOnly = false, limit = 50, lastKey } = filters;

  let filterExpression: string | undefined;
  const expressionAttributeValues: Record<string, unknown> = {
    ":pk": TenantPK.TENANT(tenantId),
    ":skPrefix": TenantPK.NOTIFICATION_PREFIX,
  };

  if (unreadOnly) {
    filterExpression = "isRead = :isRead";
    expressionAttributeValues[":isRead"] = false;
  }

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ScanIndexForward: false,
      ExclusiveStartKey: lastKey
        ? JSON.parse(Buffer.from(lastKey, "base64").toString())
        : undefined,
    }),
  );

  const notifications = (result.Items || []).map(mapToNotification);
  const unreadCount = await getUnreadCount(tenantId);

  return {
    notifications,
    unreadCount,
    lastKey: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64")
      : undefined,
  };
}

/**
 * Get unread notification count for a tenant
 */
export async function getUnreadCount(tenantId: string): Promise<number> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      FilterExpression: "isRead = :isRead",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.NOTIFICATION_PREFIX,
        ":isRead": false,
      },
      Select: "COUNT",
    }),
  );

  return result.Count || 0;
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(
  tenantId: string,
  notificationId: string,
): Promise<boolean> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      FilterExpression: "id = :id",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.NOTIFICATION_PREFIX,
        ":id": notificationId,
      },
    }),
  );

  if (!result.Items || result.Items.length === 0) {
    console.log(
      "[DBG][notificationRepo] Notification not found:",
      notificationId,
    );
    return false;
  }

  const item = result.Items[0];
  const now = new Date().toISOString();
  // TTL: 14 days from now (Unix epoch in seconds)
  const ttl = Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60;

  await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: { PK: item.PK, SK: item.SK },
      UpdateExpression:
        "SET isRead = :isRead, updatedAt = :updatedAt, #ttl = :ttl",
      ExpressionAttributeNames: { "#ttl": "ttl" },
      ExpressionAttributeValues: {
        ":isRead": true,
        ":updatedAt": now,
        ":ttl": ttl,
      },
    }),
  );

  console.log(
    "[DBG][notificationRepo] Marked notification as read with TTL:",
    notificationId,
  );
  return true;
}

/**
 * Mark all notifications as read for a tenant
 */
export async function markAllAsRead(tenantId: string): Promise<number> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      FilterExpression: "isRead = :isRead",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.NOTIFICATION_PREFIX,
        ":isRead": false,
      },
    }),
  );

  if (!result.Items || result.Items.length === 0) {
    return 0;
  }

  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60;

  const updatePromises = result.Items.map((item) =>
    docClient.send(
      new UpdateCommand({
        TableName: Tables.CORE,
        Key: { PK: item.PK, SK: item.SK },
        UpdateExpression:
          "SET isRead = :isRead, updatedAt = :updatedAt, #ttl = :ttl",
        ExpressionAttributeNames: { "#ttl": "ttl" },
        ExpressionAttributeValues: {
          ":isRead": true,
          ":updatedAt": now,
          ":ttl": ttl,
        },
      }),
    ),
  );

  await Promise.all(updatePromises);

  console.log(
    "[DBG][notificationRepo] Marked",
    result.Items.length,
    "notifications as read with TTL for:",
    tenantId,
  );
  return result.Items.length;
}

/**
 * Map DynamoDB item to CallyNotification type
 */
function mapToNotification(item: Record<string, unknown>): CallyNotification {
  let metadata: Record<string, unknown> | undefined;
  if (typeof item.metadata === "string") {
    try {
      metadata = JSON.parse(item.metadata);
    } catch {
      metadata = undefined;
    }
  } else {
    metadata = item.metadata as Record<string, unknown> | undefined;
  }

  return {
    id: item.id as string,
    recipientId: item.recipientId as string,
    type: item.type as CallyNotificationType,
    title: item.title as string,
    message: item.message as string,
    link: item.link as string | undefined,
    isRead: item.isRead as boolean,
    metadata,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
