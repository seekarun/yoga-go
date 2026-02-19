/**
 * Draft Repository - DynamoDB Operations for Email Drafts
 *
 * Stores drafts in yoga-go-emails table:
 * - PK: "DRAFT#{tenantId}"
 * - SK: "#{draftId}"
 */

import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, EmailPK } from "../dynamodb";
import type { EmailDraft, EmailDraftListResult } from "@/types";

interface DynamoDBDraftItem extends EmailDraft {
  PK: string;
  SK: string;
}

function toDraft(item: DynamoDBDraftItem): EmailDraft {
  const { PK, SK, ...draft } = item;
  void PK;
  void SK;
  return draft as EmailDraft;
}

/**
 * Create a new draft
 */
export async function createDraft(
  tenantId: string,
  draft: Omit<EmailDraft, "createdAt" | "updatedAt" | "lastSavedAt">,
): Promise<EmailDraft> {
  console.log("[DBG][draftRepository] Creating draft:", draft.id);

  const now = new Date().toISOString();
  const item: DynamoDBDraftItem = {
    PK: EmailPK.DRAFT(tenantId),
    SK: `#${draft.id}`,
    ...draft,
    lastSavedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.EMAILS,
      Item: item,
    }),
  );

  console.log("[DBG][draftRepository] Created draft:", draft.id);
  return toDraft(item);
}

/**
 * Get a draft by ID
 */
export async function getDraftById(
  tenantId: string,
  draftId: string,
): Promise<EmailDraft | null> {
  console.log("[DBG][draftRepository] Getting draft:", draftId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.EMAILS,
      Key: {
        PK: EmailPK.DRAFT(tenantId),
        SK: `#${draftId}`,
      },
    }),
  );

  if (!result.Item) {
    console.log("[DBG][draftRepository] Draft not found");
    return null;
  }

  return toDraft(result.Item as DynamoDBDraftItem);
}

/**
 * Update a draft
 */
export async function updateDraft(
  tenantId: string,
  draftId: string,
  updates: Partial<
    Pick<
      EmailDraft,
      | "to"
      | "cc"
      | "bcc"
      | "subject"
      | "bodyText"
      | "bodyHtml"
      | "attachments"
      | "mode"
      | "replyToEmailId"
      | "forwardOfEmailId"
    >
  >,
): Promise<EmailDraft | null> {
  console.log("[DBG][draftRepository] Updating draft:", draftId);

  const now = new Date().toISOString();
  const updateParts: string[] = [
    "#updatedAt = :updatedAt",
    "#lastSavedAt = :lastSavedAt",
  ];
  const exprNames: Record<string, string> = {
    "#updatedAt": "updatedAt",
    "#lastSavedAt": "lastSavedAt",
  };
  const exprValues: Record<string, unknown> = {
    ":updatedAt": now,
    ":lastSavedAt": now,
  };

  let idx = 0;
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      updateParts.push(`#k${idx} = :v${idx}`);
      exprNames[`#k${idx}`] = key;
      exprValues[`:v${idx}`] = value;
      idx++;
    }
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.EMAILS,
      Key: {
        PK: EmailPK.DRAFT(tenantId),
        SK: `#${draftId}`,
      },
      UpdateExpression: "SET " + updateParts.join(", "),
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ReturnValues: "ALL_NEW",
    }),
  );

  if (!result.Attributes) {
    console.log("[DBG][draftRepository] Draft not found for update");
    return null;
  }

  console.log("[DBG][draftRepository] Updated draft:", draftId);
  return toDraft(result.Attributes as DynamoDBDraftItem);
}

/**
 * List all drafts for a tenant
 */
export async function listDrafts(
  tenantId: string,
): Promise<EmailDraftListResult> {
  console.log("[DBG][draftRepository] Listing drafts for tenant:", tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.EMAILS,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": EmailPK.DRAFT(tenantId),
      },
      ScanIndexForward: false,
    }),
  );

  const drafts = (result.Items || []).map((item) =>
    toDraft(item as DynamoDBDraftItem),
  );

  // Sort by lastSavedAt descending
  drafts.sort(
    (a, b) =>
      new Date(b.lastSavedAt).getTime() - new Date(a.lastSavedAt).getTime(),
  );

  console.log(
    "[DBG][draftRepository] Found",
    drafts.length,
    "drafts for tenant:",
    tenantId,
  );

  return {
    drafts,
    totalCount: drafts.length,
  };
}

/**
 * Delete a draft (hard delete)
 */
export async function deleteDraft(
  tenantId: string,
  draftId: string,
): Promise<boolean> {
  console.log("[DBG][draftRepository] Deleting draft:", draftId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.EMAILS,
      Key: {
        PK: EmailPK.DRAFT(tenantId),
        SK: `#${draftId}`,
      },
    }),
  );

  console.log("[DBG][draftRepository] Deleted draft:", draftId);
  return true;
}
