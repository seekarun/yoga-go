/**
 * Subscriber Repository for CallyGo - DynamoDB Operations
 *
 * Storage pattern:
 * - PK="TENANT#{tenantId}", SK="SUBSCRIBER#EMAIL#{normalizedEmail}"
 *
 * Queries:
 * - List all subscribers: Query PK, SK begins_with "SUBSCRIBER#EMAIL#"
 * - Get subscriber by email: GetItem PK + SK
 */

import {
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, TenantPK, EntityType } from "../dynamodb";
import type { TenantSubscriber } from "@/types";

/**
 * DynamoDB item type (includes PK/SK keys)
 */
interface DynamoDBSubscriberItem extends TenantSubscriber {
  PK: string;
  SK: string;
  entityType: string;
}

/**
 * Strip DynamoDB keys from item to return clean TenantSubscriber
 */
function toSubscriber(item: DynamoDBSubscriberItem): TenantSubscriber {
  const { PK: _PK, SK: _SK, entityType: _entityType, ...subscriber } = item;
  return subscriber;
}

/**
 * Create a subscriber for a tenant
 * Uses condition expression to avoid overwriting existing subscribers
 */
export async function createSubscriber(
  tenantId: string,
  data: TenantSubscriber,
): Promise<TenantSubscriber> {
  console.log(
    `[DBG][subscriberRepository] Creating subscriber ${data.email} for tenant ${tenantId}`,
  );

  const item: DynamoDBSubscriberItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.SUBSCRIBER_EMAIL(data.email),
    entityType: EntityType.SUBSCRIBER,
    ...data,
  };

  const command = new PutCommand({
    TableName: Tables.CORE,
    Item: item,
    ConditionExpression: "attribute_not_exists(PK)",
  });

  try {
    await docClient.send(command);
    console.log(`[DBG][subscriberRepository] Created subscriber ${data.email}`);
    return data;
  } catch (error) {
    // If subscriber already exists, just return the data
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name: string }).name === "ConditionalCheckFailedException"
    ) {
      console.log(
        `[DBG][subscriberRepository] Subscriber ${data.email} already exists for tenant ${tenantId}`,
      );
      return data;
    }
    throw error;
  }
}

/**
 * Get a subscriber by email for a tenant
 */
export async function getSubscriber(
  tenantId: string,
  email: string,
): Promise<TenantSubscriber | null> {
  console.log(
    `[DBG][subscriberRepository] Getting subscriber ${email} for tenant ${tenantId}`,
  );

  const command = new GetCommand({
    TableName: Tables.CORE,
    Key: {
      PK: TenantPK.TENANT(tenantId),
      SK: TenantPK.SUBSCRIBER_EMAIL(email),
    },
  });

  const result = await docClient.send(command);

  if (!result.Item) {
    return null;
  }

  return toSubscriber(result.Item as DynamoDBSubscriberItem);
}

/**
 * Get all subscribers for a tenant, sorted by subscribedAt desc
 */
export async function getSubscribersByTenant(
  tenantId: string,
): Promise<TenantSubscriber[]> {
  console.log(
    `[DBG][subscriberRepository] Getting all subscribers for tenant ${tenantId}`,
  );

  const command = new QueryCommand({
    TableName: Tables.CORE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": TenantPK.TENANT(tenantId),
      ":skPrefix": TenantPK.SUBSCRIBER_EMAIL_PREFIX,
    },
  });

  const result = await docClient.send(command);
  const subscribers = (result.Items || []).map((item) =>
    toSubscriber(item as DynamoDBSubscriberItem),
  );

  // Sort by subscribedAt desc (newest first)
  subscribers.sort(
    (a, b) =>
      new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime(),
  );

  console.log(
    `[DBG][subscriberRepository] Found ${subscribers.length} subscribers`,
  );
  return subscribers;
}

/**
 * Delete a subscriber for a tenant
 */
export async function deleteSubscriber(
  tenantId: string,
  email: string,
): Promise<void> {
  console.log(
    `[DBG][subscriberRepository] Deleting subscriber ${email} for tenant ${tenantId}`,
  );

  const command = new DeleteCommand({
    TableName: Tables.CORE,
    Key: {
      PK: TenantPK.TENANT(tenantId),
      SK: TenantPK.SUBSCRIBER_EMAIL(email),
    },
  });

  await docClient.send(command);
  console.log(`[DBG][subscriberRepository] Deleted subscriber ${email}`);
}
