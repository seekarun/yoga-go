/**
 * Email Repository - DynamoDB Operations
 *
 * Dedicated emails table (yoga-go-emails) for high-volume storage:
 * - PK: "INBOX#{ownerId}" (ownerId is expertId or 'ADMIN')
 * - SK: "{receivedAt}#{emailId}" (sorted by date, most recent first with reverse scan)
 *
 * Thread grouping:
 * - PK: "THREAD#{threadId}"
 * - SK: emailId
 */

import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, EmailsPK } from '../dynamodb';
import type { Email, EmailAttachment, EmailAddress, EmailListResult, EmailFilters } from '@/types';

// Type for DynamoDB Email item (includes PK/SK)
interface DynamoDBEmailItem extends Email {
  PK: string;
  SK: string;
  GSI1PK?: string; // For unread emails index
  GSI1SK?: string;
}

// Input for creating a new email
export interface CreateEmailInput {
  id: string;
  expertId: string;
  messageId: string;
  threadId?: string;
  inReplyTo?: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments: EmailAttachment[];
  receivedAt: string;
  isOutgoing?: boolean;
  status?: 'received' | 'sent' | 'failed';
  errorMessage?: string;
}

/**
 * Convert DynamoDB item to Email type (removes PK/SK/GSI keys)
 */
function toEmail(item: DynamoDBEmailItem): Email {
  const { PK, SK, GSI1PK, GSI1SK, ...email } = item;
  // Suppress unused variable warnings
  void PK;
  void SK;
  void GSI1PK;
  void GSI1SK;
  return email as Email;
}

/**
 * Create a new email record
 */
export async function createEmail(input: CreateEmailInput): Promise<Email> {
  console.log('[DBG][emailRepository] Creating email:', input.id);

  const now = new Date().toISOString();
  const email: DynamoDBEmailItem = {
    // Primary key - use INBOX#{expertId} pattern in emails table
    PK: EmailsPK.INBOX(input.expertId),
    SK: `${input.receivedAt}#${input.id}`,
    // Entity fields
    id: input.id,
    expertId: input.expertId,
    messageId: input.messageId,
    threadId: input.threadId,
    inReplyTo: input.inReplyTo,
    from: input.from,
    to: input.to,
    cc: input.cc,
    subject: input.subject,
    bodyText: input.bodyText,
    bodyHtml: input.bodyHtml,
    attachments: input.attachments,
    receivedAt: input.receivedAt,
    isRead: false,
    isStarred: false,
    isOutgoing: input.isOutgoing ?? false,
    status: input.status ?? 'received',
    errorMessage: input.errorMessage,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.EMAILS,
      Item: email,
    })
  );

  // If part of a thread, also store in thread grouping
  if (input.threadId) {
    await docClient.send(
      new PutCommand({
        TableName: Tables.EMAILS,
        Item: {
          PK: EmailsPK.THREAD(input.threadId),
          SK: input.id,
          emailId: input.id,
          expertId: input.expertId,
          receivedAt: input.receivedAt,
        },
      })
    );
  }

  console.log('[DBG][emailRepository] Created email:', input.id);
  return toEmail(email);
}

/**
 * Get emails by expert ID with pagination
 */
export async function getEmailsByExpert(
  expertId: string,
  filters?: EmailFilters
): Promise<EmailListResult> {
  console.log('[DBG][emailRepository] Getting emails for expert:', expertId);

  const limit = filters?.limit ?? 20;

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.EMAILS,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': EmailsPK.INBOX(expertId),
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
      ExclusiveStartKey: filters?.lastKey
        ? JSON.parse(Buffer.from(filters.lastKey, 'base64').toString())
        : undefined,
    })
  );

  let emails = (result.Items || []).map(item => toEmail(item as DynamoDBEmailItem));

  // Apply filters
  if (filters?.unreadOnly) {
    emails = emails.filter(e => !e.isRead);
  }
  if (filters?.starredOnly) {
    emails = emails.filter(e => e.isStarred);
  }
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    emails = emails.filter(
      e =>
        e.subject.toLowerCase().includes(searchLower) ||
        e.from.email.toLowerCase().includes(searchLower) ||
        e.from.name?.toLowerCase().includes(searchLower)
    );
  }

  // Calculate unread count (separate query for accuracy)
  const unreadCount = emails.filter(e => !e.isRead).length;

  const lastKey = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : undefined;

  console.log('[DBG][emailRepository] Found', emails.length, 'emails for expert:', expertId);

  return {
    emails,
    totalCount: emails.length,
    unreadCount,
    lastKey,
  };
}

/**
 * Get single email by ID
 */
export async function getEmailById(
  emailId: string,
  expertId: string,
  receivedAt: string
): Promise<Email | null> {
  console.log('[DBG][emailRepository] Getting email by id:', emailId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.EMAILS,
      Key: {
        PK: EmailsPK.INBOX(expertId),
        SK: `${receivedAt}#${emailId}`,
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][emailRepository] Email not found');
    return null;
  }

  console.log('[DBG][emailRepository] Found email:', emailId);
  return toEmail(result.Item as DynamoDBEmailItem);
}

/**
 * Find email by scanning (when receivedAt is unknown)
 */
export async function findEmailById(emailId: string, expertId: string): Promise<Email | null> {
  console.log('[DBG][emailRepository] Finding email by id:', emailId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.EMAILS,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'id = :emailId',
      ExpressionAttributeValues: {
        ':pk': EmailsPK.INBOX(expertId),
        ':emailId': emailId,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][emailRepository] Email not found');
    return null;
  }

  console.log('[DBG][emailRepository] Found email:', emailId);
  return toEmail(result.Items[0] as DynamoDBEmailItem);
}

/**
 * Update email read/starred status
 */
export async function updateEmailStatus(
  emailId: string,
  expertId: string,
  receivedAt: string,
  updates: { isRead?: boolean; isStarred?: boolean }
): Promise<Email | null> {
  console.log('[DBG][emailRepository] Updating email status:', emailId, updates);

  const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
  const expressionNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const expressionValues: Record<string, unknown> = {
    ':updatedAt': new Date().toISOString(),
  };

  if (updates.isRead !== undefined) {
    updateExpressions.push('#isRead = :isRead');
    expressionNames['#isRead'] = 'isRead';
    expressionValues[':isRead'] = updates.isRead;
  }

  if (updates.isStarred !== undefined) {
    updateExpressions.push('#isStarred = :isStarred');
    expressionNames['#isStarred'] = 'isStarred';
    expressionValues[':isStarred'] = updates.isStarred;
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.EMAILS,
      Key: {
        PK: EmailsPK.INBOX(expertId),
        SK: `${receivedAt}#${emailId}`,
      },
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  if (!result.Attributes) {
    console.log('[DBG][emailRepository] Email not found for update');
    return null;
  }

  console.log('[DBG][emailRepository] Updated email:', emailId);
  return toEmail(result.Attributes as DynamoDBEmailItem);
}

/**
 * Get all emails in a thread
 */
export async function getEmailThread(threadId: string): Promise<Email[]> {
  console.log('[DBG][emailRepository] Getting thread:', threadId);

  // First get email IDs from thread grouping
  const threadResult = await docClient.send(
    new QueryCommand({
      TableName: Tables.EMAILS,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': EmailsPK.THREAD(threadId),
      },
    })
  );

  if (!threadResult.Items || threadResult.Items.length === 0) {
    console.log('[DBG][emailRepository] Thread not found');
    return [];
  }

  // Fetch each email
  const emails: Email[] = [];
  for (const item of threadResult.Items) {
    const email = await findEmailById(item.emailId as string, item.expertId as string);
    if (email) {
      emails.push(email);
    }
  }

  // Sort by receivedAt
  emails.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

  console.log('[DBG][emailRepository] Found', emails.length, 'emails in thread');
  return emails;
}

/**
 * Get unread count for expert
 */
export async function getUnreadCount(expertId: string): Promise<number> {
  console.log('[DBG][emailRepository] Getting unread count for:', expertId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.EMAILS,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'isRead = :isRead',
      ExpressionAttributeValues: {
        ':pk': EmailsPK.INBOX(expertId),
        ':isRead': false,
      },
      Select: 'COUNT',
    })
  );

  const count = result.Count ?? 0;
  console.log('[DBG][emailRepository] Unread count:', count);
  return count;
}
