/**
 * Knowledge Repository for CallyGo - DynamoDB Operations
 *
 * Document metadata CRUD (chunk storage is handled by the RAG provider).
 *
 * Key design:
 * - PK: "TENANT#{tenantId}"
 * - SK: "KNOWLEDGE#DOC#{docId}"
 */

import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, TenantPK, EntityType } from "../dynamodb";
import type {
  KnowledgeDocument,
  KnowledgeDocStatus,
  KnowledgeDocSource,
} from "@/types";

interface DynamoDBKnowledgeDocItem extends KnowledgeDocument {
  PK: string;
  SK: string;
  entityType: string;
}

/**
 * Convert DynamoDB item to KnowledgeDocument (removes PK/SK)
 */
function toKnowledgeDoc(item: DynamoDBKnowledgeDocItem): KnowledgeDocument {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, entityType, ...doc } = item;
  return doc as KnowledgeDocument;
}

/**
 * Generate a unique document ID
 */
function generateDocId(): string {
  return `kdoc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export interface CreateKnowledgeDocInput {
  title: string;
  content: string;
  source?: KnowledgeDocSource;
}

/**
 * Create a new knowledge document
 */
export async function createKnowledgeDoc(
  tenantId: string,
  input: CreateKnowledgeDocInput,
): Promise<KnowledgeDocument> {
  const now = new Date().toISOString();
  const docId = generateDocId();

  const doc: KnowledgeDocument = {
    id: docId,
    tenantId,
    title: input.title,
    source: input.source || "text",
    content: input.content,
    chunkCount: 0,
    status: "processing",
    createdAt: now,
    updatedAt: now,
  };

  console.log(
    "[DBG][knowledgeRepository] Creating knowledge doc:",
    docId,
    "tenant:",
    tenantId,
  );

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.KNOWLEDGE_DOC(docId),
        entityType: EntityType.KNOWLEDGE_DOC,
        ...doc,
      },
    }),
  );

  console.log("[DBG][knowledgeRepository] Knowledge doc created");
  return doc;
}

/**
 * Get all knowledge documents for a tenant
 */
export async function getKnowledgeDocsByTenant(
  tenantId: string,
): Promise<KnowledgeDocument[]> {
  console.log(
    "[DBG][knowledgeRepository] Querying knowledge docs for tenant:",
    tenantId,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.KNOWLEDGE_DOC_PREFIX,
      },
      ScanIndexForward: false,
    }),
  );

  const items = (result.Items || []) as DynamoDBKnowledgeDocItem[];
  console.log(
    "[DBG][knowledgeRepository] Found",
    items.length,
    "knowledge docs",
  );
  return items.map(toKnowledgeDoc);
}

/**
 * Get a single knowledge document
 */
export async function getKnowledgeDoc(
  tenantId: string,
  docId: string,
): Promise<KnowledgeDocument | null> {
  console.log(
    "[DBG][knowledgeRepository] Getting knowledge doc:",
    docId,
    "tenant:",
    tenantId,
  );

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.KNOWLEDGE_DOC(docId),
      },
    }),
  );

  if (!result.Item) {
    console.log("[DBG][knowledgeRepository] Knowledge doc not found");
    return null;
  }

  return toKnowledgeDoc(result.Item as DynamoDBKnowledgeDocItem);
}

/**
 * Update knowledge document status and optional fields
 */
export async function updateKnowledgeDocStatus(
  tenantId: string,
  docId: string,
  status: KnowledgeDocStatus,
  updates?: Partial<Pick<KnowledgeDocument, "chunkCount" | "errorMessage">>,
): Promise<void> {
  console.log(
    "[DBG][knowledgeRepository] Updating knowledge doc status:",
    status,
    "doc:",
    docId,
  );

  const now = new Date().toISOString();
  const updateExpressions: string[] = [
    "#status = :status",
    "#updatedAt = :updatedAt",
  ];
  const expressionNames: Record<string, string> = {
    "#status": "status",
    "#updatedAt": "updatedAt",
  };
  const expressionValues: Record<string, unknown> = {
    ":status": status,
    ":updatedAt": now,
  };

  if (updates?.chunkCount !== undefined) {
    updateExpressions.push("#chunkCount = :chunkCount");
    expressionNames["#chunkCount"] = "chunkCount";
    expressionValues[":chunkCount"] = updates.chunkCount;
  }
  if (updates?.errorMessage !== undefined) {
    updateExpressions.push("#errorMessage = :errorMessage");
    expressionNames["#errorMessage"] = "errorMessage";
    expressionValues[":errorMessage"] = updates.errorMessage;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.KNOWLEDGE_DOC(docId),
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
    }),
  );

  console.log("[DBG][knowledgeRepository] Knowledge doc status updated");
}

/**
 * Delete a knowledge document (metadata only - chunks deleted by RAG provider)
 */
export async function deleteKnowledgeDoc(
  tenantId: string,
  docId: string,
): Promise<void> {
  console.log(
    "[DBG][knowledgeRepository] Deleting knowledge doc:",
    docId,
    "tenant:",
    tenantId,
  );

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.KNOWLEDGE_DOC(docId),
      },
    }),
  );

  console.log("[DBG][knowledgeRepository] Knowledge doc deleted");
}
