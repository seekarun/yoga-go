/**
 * Waitlist Repository - DynamoDB Operations
 *
 * Single-table design (CORE table):
 *
 * Pending verification:
 * - PK: "WAITLIST_PENDING#{email}"
 * - SK: "PIN"
 * - TTL: 10 minutes from creation
 *
 * Verified signups:
 * - PK: "WAITLIST"
 * - SK: "{createdAt}#{email}"
 */

import { GetCommand, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, CorePK, EntityType } from '../dynamodb';

// Types
export interface WaitlistPendingRecord {
  email: string;
  pin: string;
  createdAt: string;
  expiresAt: number; // TTL timestamp
}

export interface WaitlistSignup {
  id: string;
  email: string;
  name: string;
  thoughts: string;
  createdAt: string;
  verifiedAt: string;
}

// DynamoDB item types
interface DynamoDBPendingItem extends WaitlistPendingRecord {
  PK: string;
  SK: string;
  entityType: string;
  TTL: number;
}

interface DynamoDBSignupItem extends WaitlistSignup {
  PK: string;
  SK: string;
  entityType: string;
}

/**
 * Generate a 6-digit PIN
 */
export function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create a pending verification record with PIN
 * PIN expires in 10 minutes
 */
export async function createPendingVerification(email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();
  const pin = generatePin();
  const now = new Date();
  const expiresAt = Math.floor(now.getTime() / 1000) + 600; // 10 minutes from now

  console.log('[DBG][waitlistRepository] Creating pending verification for:', normalizedEmail);

  const item: DynamoDBPendingItem = {
    PK: CorePK.WAITLIST_PENDING(normalizedEmail),
    SK: 'PIN',
    entityType: EntityType.WAITLIST_PENDING,
    email: normalizedEmail,
    pin,
    createdAt: now.toISOString(),
    expiresAt,
    TTL: expiresAt,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: item,
    })
  );

  console.log('[DBG][waitlistRepository] Pending verification created');
  return pin;
}

/**
 * Get pending verification by email
 */
export async function getPendingVerification(email: string): Promise<WaitlistPendingRecord | null> {
  const normalizedEmail = email.toLowerCase().trim();
  console.log('[DBG][waitlistRepository] Getting pending verification for:', normalizedEmail);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.WAITLIST_PENDING(normalizedEmail),
        SK: 'PIN',
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][waitlistRepository] Pending verification not found');
    return null;
  }

  const item = result.Item as DynamoDBPendingItem;

  // Check if expired
  const now = Math.floor(Date.now() / 1000);
  if (item.TTL && item.TTL < now) {
    console.log('[DBG][waitlistRepository] Pending verification expired');
    return null;
  }

  return {
    email: item.email,
    pin: item.pin,
    createdAt: item.createdAt,
    expiresAt: item.expiresAt,
  };
}

/**
 * Delete pending verification
 */
export async function deletePendingVerification(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  console.log('[DBG][waitlistRepository] Deleting pending verification for:', normalizedEmail);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.WAITLIST_PENDING(normalizedEmail),
        SK: 'PIN',
      },
    })
  );
}

/**
 * Create verified waitlist signup
 */
export async function createWaitlistSignup(
  email: string,
  name: string,
  thoughts: string
): Promise<WaitlistSignup> {
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date().toISOString();
  const id = `${now}_${normalizedEmail}`;

  console.log('[DBG][waitlistRepository] Creating waitlist signup for:', normalizedEmail);

  const signup: WaitlistSignup = {
    id,
    email: normalizedEmail,
    name: name.trim(),
    thoughts: thoughts.trim(),
    createdAt: now,
    verifiedAt: now,
  };

  const item: DynamoDBSignupItem = {
    PK: CorePK.WAITLIST,
    SK: `${now}#${normalizedEmail}`,
    entityType: EntityType.WAITLIST,
    ...signup,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: item,
    })
  );

  console.log('[DBG][waitlistRepository] Waitlist signup created');
  return signup;
}

/**
 * Check if email is already on waitlist
 */
export async function isEmailOnWaitlist(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  console.log('[DBG][waitlistRepository] Checking if email is on waitlist:', normalizedEmail);

  // Query all waitlist items and check for email
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':pk': CorePK.WAITLIST,
        ':email': normalizedEmail,
      },
      Limit: 1,
    })
  );

  const exists = (result.Items?.length ?? 0) > 0;
  console.log('[DBG][waitlistRepository] Email on waitlist:', exists);
  return exists;
}

/**
 * Get all waitlist signups (for admin)
 */
export async function getAllWaitlistSignups(): Promise<WaitlistSignup[]> {
  console.log('[DBG][waitlistRepository] Getting all waitlist signups');

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': CorePK.WAITLIST,
      },
      ScanIndexForward: false, // Most recent first
    })
  );

  const signups =
    result.Items?.map(item => {
      const dbItem = item as DynamoDBSignupItem;
      return {
        id: dbItem.id,
        email: dbItem.email,
        name: dbItem.name,
        thoughts: dbItem.thoughts,
        createdAt: dbItem.createdAt,
        verifiedAt: dbItem.verifiedAt,
      };
    }) || [];

  console.log('[DBG][waitlistRepository] Found', signups.length, 'signups');
  return signups;
}
