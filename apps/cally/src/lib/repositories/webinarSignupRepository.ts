/**
 * Webinar Signup Repository for CallyGo - DynamoDB Operations
 *
 * Storage pattern:
 * - PK="TENANT#{tenantId}", SK="WEBINAR_SIGNUP#{productId}#EMAIL#{normalizedEmail}"
 *
 * Queries:
 * - List all signups for a webinar: Query PK, SK begins_with "WEBINAR_SIGNUP#{productId}#"
 * - Get signup by email: GetItem PK + SK
 * - Count signups: Query with Select: "COUNT"
 */

import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, TenantPK, EntityType } from "../dynamodb";
import type { WebinarSignup } from "@/types";

/**
 * DynamoDB item type (includes PK/SK keys)
 */
interface DynamoDBWebinarSignupItem extends WebinarSignup {
  PK: string;
  SK: string;
  entityType: string;
}

/**
 * Strip DynamoDB keys from item to return clean WebinarSignup
 */
function toSignup(item: DynamoDBWebinarSignupItem): WebinarSignup {
  const { PK: _PK, SK: _SK, entityType: _entityType, ...signup } = item;
  return signup;
}

/**
 * Create a webinar signup for a tenant.
 * Uses condition expression to prevent duplicate signups.
 * Throws Error("ALREADY_SIGNED_UP") if the visitor is already signed up.
 */
export async function createWebinarSignup(
  tenantId: string,
  signup: WebinarSignup,
): Promise<WebinarSignup> {
  console.log(
    `[DBG][webinarSignupRepo] Creating signup for ${signup.visitorEmail} on product ${signup.productId} for tenant ${tenantId}`,
  );

  const item: DynamoDBWebinarSignupItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.WEBINAR_SIGNUP(signup.productId, signup.visitorEmail),
    entityType: EntityType.WEBINAR_SIGNUP,
    ...signup,
  };

  const command = new PutCommand({
    TableName: Tables.CORE,
    Item: item,
    ConditionExpression: "attribute_not_exists(PK)",
  });

  try {
    await docClient.send(command);
    console.log(
      `[DBG][webinarSignupRepo] Created signup for ${signup.visitorEmail}`,
    );
    return signup;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name: string }).name === "ConditionalCheckFailedException"
    ) {
      console.log(
        `[DBG][webinarSignupRepo] Visitor ${signup.visitorEmail} already signed up for product ${signup.productId}`,
      );
      throw new Error("ALREADY_SIGNED_UP");
    }
    throw error;
  }
}

/**
 * Get a single webinar signup by email
 */
export async function getWebinarSignup(
  tenantId: string,
  productId: string,
  email: string,
): Promise<WebinarSignup | null> {
  console.log(
    `[DBG][webinarSignupRepo] Getting signup for ${email} on product ${productId} for tenant ${tenantId}`,
  );

  const command = new GetCommand({
    TableName: Tables.CORE,
    Key: {
      PK: TenantPK.TENANT(tenantId),
      SK: TenantPK.WEBINAR_SIGNUP(productId, email),
    },
  });

  const result = await docClient.send(command);

  if (!result.Item) {
    return null;
  }

  return toSignup(result.Item as DynamoDBWebinarSignupItem);
}

/**
 * Get all signups for a webinar product, sorted by signedUpAt desc
 */
export async function getWebinarSignups(
  tenantId: string,
  productId: string,
): Promise<WebinarSignup[]> {
  console.log(
    `[DBG][webinarSignupRepo] Getting all signups for product ${productId} in tenant ${tenantId}`,
  );

  const command = new QueryCommand({
    TableName: Tables.CORE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": TenantPK.TENANT(tenantId),
      ":skPrefix": TenantPK.WEBINAR_SIGNUP_PRODUCT_PREFIX(productId),
    },
  });

  const result = await docClient.send(command);
  const signups = (result.Items || []).map((item) =>
    toSignup(item as DynamoDBWebinarSignupItem),
  );

  // Sort by signedUpAt desc (newest first)
  signups.sort(
    (a, b) =>
      new Date(b.signedUpAt).getTime() - new Date(a.signedUpAt).getTime(),
  );

  console.log(
    `[DBG][webinarSignupRepo] Found ${signups.length} signups for product ${productId}`,
  );
  return signups;
}

/**
 * Count signups for a webinar product (uses Select: "COUNT" for efficiency)
 */
export async function countWebinarSignups(
  tenantId: string,
  productId: string,
): Promise<number> {
  console.log(
    `[DBG][webinarSignupRepo] Counting signups for product ${productId} in tenant ${tenantId}`,
  );

  const command = new QueryCommand({
    TableName: Tables.CORE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": TenantPK.TENANT(tenantId),
      ":skPrefix": TenantPK.WEBINAR_SIGNUP_PRODUCT_PREFIX(productId),
    },
    Select: "COUNT",
  });

  const result = await docClient.send(command);
  const count = result.Count ?? 0;

  console.log(
    `[DBG][webinarSignupRepo] Count for product ${productId}: ${count}`,
  );
  return count;
}

/**
 * Update payment status for a webinar signup
 */
export async function updateWebinarSignupPayment(
  tenantId: string,
  productId: string,
  email: string,
  paymentStatus: WebinarSignup["paymentStatus"],
  stripePaymentIntentId?: string,
): Promise<WebinarSignup | null> {
  console.log(
    `[DBG][webinarSignupRepo] Updating payment for ${email} on product ${productId}: ${paymentStatus}`,
  );

  const expressionParts: string[] = ["#paymentStatus = :paymentStatus"];
  const expressionValues: Record<string, string> = {
    ":paymentStatus": paymentStatus,
  };
  const expressionNames: Record<string, string> = {
    "#paymentStatus": "paymentStatus",
  };

  if (stripePaymentIntentId) {
    expressionParts.push("stripePaymentIntentId = :stripePaymentIntentId");
    expressionValues[":stripePaymentIntentId"] = stripePaymentIntentId;
  }

  const command = new UpdateCommand({
    TableName: Tables.CORE,
    Key: {
      PK: TenantPK.TENANT(tenantId),
      SK: TenantPK.WEBINAR_SIGNUP(productId, email),
    },
    UpdateExpression: `SET ${expressionParts.join(", ")}`,
    ExpressionAttributeValues: expressionValues,
    ExpressionAttributeNames: expressionNames,
    ReturnValues: "ALL_NEW",
  });

  const result = await docClient.send(command);

  if (!result.Attributes) {
    return null;
  }

  console.log(
    `[DBG][webinarSignupRepo] Updated payment for ${email} to ${paymentStatus}`,
  );
  return toSignup(result.Attributes as DynamoDBWebinarSignupItem);
}

/**
 * Delete a single webinar signup
 */
export async function deleteWebinarSignup(
  tenantId: string,
  productId: string,
  email: string,
): Promise<void> {
  console.log(
    `[DBG][webinarSignupRepo] Deleting signup for ${email} on product ${productId} for tenant ${tenantId}`,
  );

  const command = new DeleteCommand({
    TableName: Tables.CORE,
    Key: {
      PK: TenantPK.TENANT(tenantId),
      SK: TenantPK.WEBINAR_SIGNUP(productId, email),
    },
  });

  await docClient.send(command);
  console.log(`[DBG][webinarSignupRepo] Deleted signup for ${email}`);
}

/**
 * Delete all signups for a webinar product (used when deleting a product).
 * Queries all signups then batch-deletes them in groups of 25.
 */
export async function deleteAllWebinarSignups(
  tenantId: string,
  productId: string,
): Promise<number> {
  console.log(
    `[DBG][webinarSignupRepo] Deleting all signups for product ${productId} in tenant ${tenantId}`,
  );

  // First, query all signups to get their keys
  const queryCommand = new QueryCommand({
    TableName: Tables.CORE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": TenantPK.TENANT(tenantId),
      ":skPrefix": TenantPK.WEBINAR_SIGNUP_PRODUCT_PREFIX(productId),
    },
    ProjectionExpression: "PK, SK",
  });

  const result = await docClient.send(queryCommand);
  const items = result.Items || [];

  if (items.length === 0) {
    console.log(
      `[DBG][webinarSignupRepo] No signups to delete for product ${productId}`,
    );
    return 0;
  }

  // Batch delete in groups of 25 (DynamoDB limit)
  const batchSize = 25;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const deleteRequests = batch.map((item) => ({
      DeleteRequest: {
        Key: {
          PK: item.PK,
          SK: item.SK,
        },
      },
    }));

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [Tables.CORE]: deleteRequests,
        },
      }),
    );
  }

  console.log(
    `[DBG][webinarSignupRepo] Batch deleted ${items.length} signups for product ${productId}`,
  );
  return items.length;
}
