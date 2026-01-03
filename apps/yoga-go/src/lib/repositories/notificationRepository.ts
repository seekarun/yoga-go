/**
 * Notification Repository
 *
 * Handles CRUD operations for real-time notifications.
 * Uses DynamoDB for persistent storage and Firebase RTDB for real-time delivery.
 *
 * Storage: DISCUSSIONS table (yoga-go-discussions)
 * PK: TENANT#{recipientId}
 * SK: NOTIF#{createdAt}#{notificationId}
 */

import { QueryCommand, UpdateCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, Tables, NotificationPK, EntityType } from '@/lib/dynamodb';
import type { Notification, NotificationType } from '@/types';

// Input for creating a notification
export interface CreateNotificationInput {
  recipientId: string;
  recipientType: 'user' | 'expert';
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

// Filters for listing notifications
export interface NotificationFilters {
  unreadOnly?: boolean;
  limit?: number;
  lastKey?: string;
}

// Result type for paginated list
export interface NotificationListResult {
  notifications: Notification[];
  unreadCount: number;
  lastKey?: string;
}

/**
 * Create a new notification
 */
export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  const now = new Date().toISOString();
  const id = uuidv4();

  const notification: Notification = {
    id,
    recipientId: input.recipientId,
    recipientType: input.recipientType,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link,
    isRead: false,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };

  const item = {
    PK: NotificationPK.RECIPIENT(input.recipientId),
    SK: NotificationPK.NOTIFICATION_SK(now, id),
    EntityType: EntityType.NOTIFICATION,
    ...notification,
  };

  // Use BatchWriteCommand for atomic write
  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.DISCUSSIONS]: [
          {
            PutRequest: {
              Item: item,
            },
          },
        ],
      },
    })
  );

  console.log(
    '[DBG][notificationRepo] Created notification:',
    id,
    'for recipient:',
    input.recipientId
  );
  return notification;
}

/**
 * Get notifications for a recipient
 */
export async function getNotificationsByRecipient(
  recipientId: string,
  filters: NotificationFilters = {}
): Promise<NotificationListResult> {
  const { unreadOnly = false, limit = 50, lastKey } = filters;

  let filterExpression: string | undefined;
  const expressionAttributeValues: Record<string, unknown> = {
    ':pk': NotificationPK.RECIPIENT(recipientId),
    ':skPrefix': NotificationPK.NOTIFICATION_PREFIX,
  };

  if (unreadOnly) {
    filterExpression = 'isRead = :isRead';
    expressionAttributeValues[':isRead'] = false;
  }

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ScanIndexForward: false, // Most recent first
      ExclusiveStartKey: lastKey
        ? JSON.parse(Buffer.from(lastKey, 'base64').toString())
        : undefined,
    })
  );

  const notifications = (result.Items || []).map(mapToNotification);

  // Get unread count separately for accurate count
  const unreadCount = await getUnreadCount(recipientId);

  return {
    notifications,
    unreadCount,
    lastKey: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined,
  };
}

/**
 * Get unread notification count for a recipient
 */
export async function getUnreadCount(recipientId: string): Promise<number> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'isRead = :isRead',
      ExpressionAttributeValues: {
        ':pk': NotificationPK.RECIPIENT(recipientId),
        ':skPrefix': NotificationPK.NOTIFICATION_PREFIX,
        ':isRead': false,
      },
      Select: 'COUNT',
    })
  );

  return result.Count || 0;
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(recipientId: string, notificationId: string): Promise<boolean> {
  // First, find the notification to get its SK
  // Note: No Limit here because FilterExpression is applied AFTER Limit in DynamoDB
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':pk': NotificationPK.RECIPIENT(recipientId),
        ':skPrefix': NotificationPK.NOTIFICATION_PREFIX,
        ':id': notificationId,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][notificationRepo] Notification not found:', notificationId);
    return false;
  }

  const item = result.Items[0];
  const now = new Date().toISOString();
  // TTL: 14 days from now (Unix epoch in seconds)
  const ttl = Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60;

  await docClient.send(
    new UpdateCommand({
      TableName: Tables.DISCUSSIONS,
      Key: {
        PK: item.PK,
        SK: item.SK,
      },
      UpdateExpression: 'SET isRead = :isRead, updatedAt = :updatedAt, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':isRead': true,
        ':updatedAt': now,
        ':ttl': ttl,
      },
    })
  );

  console.log('[DBG][notificationRepo] Marked notification as read with TTL:', notificationId);
  return true;
}

/**
 * Mark all notifications as read for a recipient
 */
export async function markAllAsRead(recipientId: string): Promise<number> {
  // Get all unread notifications
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'isRead = :isRead',
      ExpressionAttributeValues: {
        ':pk': NotificationPK.RECIPIENT(recipientId),
        ':skPrefix': NotificationPK.NOTIFICATION_PREFIX,
        ':isRead': false,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return 0;
  }

  const now = new Date().toISOString();
  // TTL: 14 days from now (Unix epoch in seconds)
  const ttl = Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60;

  // Update each notification
  const updatePromises = result.Items.map(item =>
    docClient.send(
      new UpdateCommand({
        TableName: Tables.DISCUSSIONS,
        Key: {
          PK: item.PK,
          SK: item.SK,
        },
        UpdateExpression: 'SET isRead = :isRead, updatedAt = :updatedAt, #ttl = :ttl',
        ExpressionAttributeNames: {
          '#ttl': 'ttl',
        },
        ExpressionAttributeValues: {
          ':isRead': true,
          ':updatedAt': now,
          ':ttl': ttl,
        },
      })
    )
  );

  await Promise.all(updatePromises);

  console.log(
    '[DBG][notificationRepo] Marked',
    result.Items.length,
    'notifications as read with TTL for:',
    recipientId
  );
  return result.Items.length;
}

/**
 * Map DynamoDB item to Notification type
 */
function mapToNotification(item: Record<string, unknown>): Notification {
  // Parse metadata if it's a JSON string (stored by lambda)
  let metadata: Record<string, unknown> | undefined;
  if (typeof item.metadata === 'string') {
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
    recipientType: item.recipientType as 'user' | 'expert',
    type: item.type as NotificationType,
    title: item.title as string,
    message: item.message as string,
    link: item.link as string | undefined,
    isRead: item.isRead as boolean,
    metadata,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
