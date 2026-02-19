/**
 * Email Label Repository - DynamoDB Operations
 *
 * Stores labels in cally-main table:
 * - PK: "TENANT#{tenantId}", SK: "EMAIL_LABEL#{labelId}"
 */

import {
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, TenantPK } from "../dynamodb";
import type { EmailLabel } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface DynamoDBLabelItem extends EmailLabel {
  PK: string;
  SK: string;
}

function toLabel(item: DynamoDBLabelItem): EmailLabel {
  const { PK, SK, ...label } = item;
  void PK;
  void SK;
  return label as EmailLabel;
}

/**
 * Create a new email label
 */
export async function createLabel(
  tenantId: string,
  name: string,
  color: string,
): Promise<EmailLabel> {
  const id = uuidv4();
  const now = new Date().toISOString();

  console.log("[DBG][emailLabelRepository] Creating label:", name);

  const item: DynamoDBLabelItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.EMAIL_LABEL(id),
    id,
    name,
    color,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: item,
    }),
  );

  console.log("[DBG][emailLabelRepository] Created label:", id);
  return toLabel(item);
}

/**
 * Get all labels for a tenant
 */
export async function getLabelsByTenant(
  tenantId: string,
): Promise<EmailLabel[]> {
  console.log(
    "[DBG][emailLabelRepository] Getting labels for tenant:",
    tenantId,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":prefix": TenantPK.EMAIL_LABEL_PREFIX,
      },
    }),
  );

  const labels = (result.Items || []).map((item) =>
    toLabel(item as DynamoDBLabelItem),
  );

  console.log(
    "[DBG][emailLabelRepository] Found",
    labels.length,
    "labels for tenant:",
    tenantId,
  );
  return labels;
}

/**
 * Update a label's name and/or color
 */
export async function updateLabel(
  tenantId: string,
  labelId: string,
  updates: { name?: string; color?: string },
): Promise<EmailLabel | null> {
  console.log("[DBG][emailLabelRepository] Updating label:", labelId);

  const updateExpressions: string[] = ["#updatedAt = :updatedAt"];
  const expressionNames: Record<string, string> = {
    "#updatedAt": "updatedAt",
  };
  const expressionValues: Record<string, unknown> = {
    ":updatedAt": new Date().toISOString(),
  };

  if (updates.name !== undefined) {
    updateExpressions.push("#name = :name");
    expressionNames["#name"] = "name";
    expressionValues[":name"] = updates.name;
  }
  if (updates.color !== undefined) {
    updateExpressions.push("#color = :color");
    expressionNames["#color"] = "color";
    expressionValues[":color"] = updates.color;
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.EMAIL_LABEL(labelId),
      },
      UpdateExpression: "SET " + updateExpressions.join(", "),
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: "ALL_NEW",
    }),
  );

  if (!result.Attributes) {
    console.log("[DBG][emailLabelRepository] Label not found for update");
    return null;
  }

  console.log("[DBG][emailLabelRepository] Updated label:", labelId);
  return toLabel(result.Attributes as DynamoDBLabelItem);
}

/**
 * Delete a label
 */
export async function deleteLabel(
  tenantId: string,
  labelId: string,
): Promise<boolean> {
  console.log("[DBG][emailLabelRepository] Deleting label:", labelId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.EMAIL_LABEL(labelId),
      },
    }),
  );

  console.log("[DBG][emailLabelRepository] Deleted label:", labelId);
  return true;
}
