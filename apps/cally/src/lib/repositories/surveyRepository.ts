/**
 * Survey Repository for Cally - DynamoDB Operations
 *
 * Storage patterns:
 * - Surveys:   PK="TENANT#{tenantId}", SK="SURVEY#{timestamp}#{surveyId}"
 * - Responses: PK="TENANT#{tenantId}", SK="SURVEYRESP#{surveyId}#{timestamp}#{responseId}"
 *
 * Queries:
 * - List surveys:   Query PK, SK begins_with "SURVEY#"
 * - Get one survey: Query SURVEY# prefix, filter by id
 * - List responses: Query SURVEYRESP#{surveyId}# prefix
 */

import {
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, TenantPK, EntityType } from "../dynamodb";
import type {
  Survey,
  SurveyStatus,
  SurveyQuestion,
  SurveyContactInfo,
  SurveyResponse,
  SurveyAnswer,
  SurveyResponseContactInfo,
  SurveyResponseMetadata,
} from "@/types";

/* ─────────────────────── Helpers ─────────────────────── */

interface DynamoDBSurveyItem extends Survey {
  PK: string;
  SK: string;
  entityType: string;
  tenantId: string;
}

interface DynamoDBResponseItem extends SurveyResponse {
  PK: string;
  SK: string;
  entityType: string;
}

function toSurvey(item: DynamoDBSurveyItem): Survey {
  const {
    PK: _PK,
    SK: _SK,
    entityType: _entityType,
    tenantId: _tenantId,
    ...survey
  } = item;
  return survey;
}

function toResponse(item: DynamoDBResponseItem): SurveyResponse {
  const { PK: _PK, SK: _SK, entityType: _entityType, ...resp } = item;
  return resp;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/* ─────────────────────── Surveys ─────────────────────── */

/**
 * Create a new draft survey
 */
export async function createSurvey(
  tenantId: string,
  data: {
    expertId: string;
    title: string;
    description?: string;
  },
): Promise<Survey> {
  const id = generateId();
  const createdAt = new Date().toISOString();

  console.log(
    `[DBG][surveyRepository] Creating survey "${data.title}" for tenant ${tenantId}`,
  );

  const survey: Survey = {
    id,
    expertId: data.expertId,
    title: data.title,
    description: data.description,
    questions: [
      {
        id: generateId(),
        questionText: "Thank you for your time",
        type: "finish",
        required: false,
        order: 1,
        branches: [],
        position: { x: 200, y: 200 },
      },
    ],
    status: "draft",
    createdAt,
  };

  const item: DynamoDBSurveyItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.SURVEY(createdAt, id),
    entityType: EntityType.SURVEY,
    tenantId,
    ...survey,
  };

  await docClient.send(new PutCommand({ TableName: Tables.CORE, Item: item }));
  console.log(`[DBG][surveyRepository] Created survey ${id}`);
  return survey;
}

/**
 * Update survey title, description, questions, or contactInfo
 */
export async function updateSurvey(
  tenantId: string,
  surveyId: string,
  createdAt: string,
  data: {
    title?: string;
    description?: string;
    questions?: SurveyQuestion[];
    contactInfo?: SurveyContactInfo;
  },
): Promise<void> {
  console.log(
    `[DBG][surveyRepository] Updating survey ${surveyId} for tenant ${tenantId}`,
  );

  const expressionParts: string[] = ["updatedAt = :now"];
  const attrValues: Record<string, unknown> = {
    ":now": new Date().toISOString(),
  };
  const attrNames: Record<string, string> = {};

  if (data.title !== undefined) {
    expressionParts.push("title = :title");
    attrValues[":title"] = data.title;
  }
  if (data.description !== undefined) {
    expressionParts.push("description = :desc");
    attrValues[":desc"] = data.description;
  }
  if (data.questions !== undefined) {
    expressionParts.push("questions = :questions");
    attrValues[":questions"] = data.questions;
  }
  if (data.contactInfo !== undefined) {
    expressionParts.push("contactInfo = :ci");
    attrValues[":ci"] = data.contactInfo;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.SURVEY(createdAt, surveyId),
      },
      UpdateExpression: `SET ${expressionParts.join(", ")}`,
      ExpressionAttributeValues: attrValues,
      ...(Object.keys(attrNames).length > 0
        ? { ExpressionAttributeNames: attrNames }
        : {}),
    }),
  );

  console.log(`[DBG][surveyRepository] Survey ${surveyId} updated`);
}

/**
 * List all surveys for a tenant (newest first)
 */
export async function getSurveysByTenant(tenantId: string): Promise<Survey[]> {
  console.log(
    `[DBG][surveyRepository] Getting all surveys for tenant ${tenantId}`,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.SURVEY_PREFIX,
      },
      ScanIndexForward: false,
    }),
  );

  const items = (result.Items || []).map((item) =>
    toSurvey(item as DynamoDBSurveyItem),
  );
  console.log(`[DBG][surveyRepository] Found ${items.length} surveys`);
  return items;
}

/**
 * Get a single survey by ID within a tenant
 */
export async function getSurveyById(
  tenantId: string,
  surveyId: string,
): Promise<Survey | null> {
  console.log(
    `[DBG][surveyRepository] Getting survey ${surveyId} for tenant ${tenantId}`,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      FilterExpression: "id = :id",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.SURVEY_PREFIX,
        ":id": surveyId,
      },
    }),
  );

  const items = result.Items || [];
  if (items.length === 0) {
    console.log(`[DBG][surveyRepository] Survey ${surveyId} not found`);
    return null;
  }

  return toSurvey(items[0] as DynamoDBSurveyItem);
}

/**
 * Update survey status
 */
export async function updateSurveyStatus(
  tenantId: string,
  surveyId: string,
  createdAt: string,
  status: SurveyStatus,
): Promise<void> {
  console.log(
    `[DBG][surveyRepository] Updating survey ${surveyId} status to ${status}`,
  );

  const expressionParts = [
    "#status = :status",
    "updatedAt = :now",
    "isActive = :isActive",
  ];
  const attrValues: Record<string, unknown> = {
    ":status": status,
    ":now": new Date().toISOString(),
    ":isActive": status === "active",
  };

  if (status === "closed") {
    expressionParts.push("closedAt = :closedAt");
    attrValues[":closedAt"] = new Date().toISOString();
  }
  if (status === "archived") {
    expressionParts.push("archivedAt = :archivedAt");
    attrValues[":archivedAt"] = new Date().toISOString();
  }

  await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.SURVEY(createdAt, surveyId),
      },
      UpdateExpression: `SET ${expressionParts.join(", ")}`,
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: attrValues,
    }),
  );

  console.log(`[DBG][surveyRepository] Survey ${surveyId} status → ${status}`);
}

/**
 * Delete a survey
 */
export async function deleteSurvey(
  tenantId: string,
  surveyId: string,
  createdAt: string,
): Promise<void> {
  console.log(
    `[DBG][surveyRepository] Deleting survey ${surveyId} for tenant ${tenantId}`,
  );

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.SURVEY(createdAt, surveyId),
      },
    }),
  );

  console.log(`[DBG][surveyRepository] Survey ${surveyId} deleted`);
}

/**
 * Duplicate an existing survey as a new draft (remaps all IDs)
 */
export async function duplicateSurvey(
  tenantId: string,
  sourceSurveyId: string,
  expertId: string,
): Promise<Survey | null> {
  console.log(
    `[DBG][surveyRepository] Duplicating survey ${sourceSurveyId} for tenant ${tenantId}`,
  );

  const source = await getSurveyById(tenantId, sourceSurveyId);
  if (!source) return null;

  // Build ID mapping for questions and options
  const questionIdMap = new Map<string, string>();
  const optionIdMap = new Map<string, string>();

  for (const q of source.questions) {
    questionIdMap.set(q.id, generateId());
    for (const opt of q.options ?? []) {
      optionIdMap.set(opt.id, generateId());
    }
  }

  // Remap questions with new IDs
  const newQuestions: SurveyQuestion[] = source.questions.map((q) => ({
    ...q,
    id: questionIdMap.get(q.id)!,
    options: q.options?.map((opt) => ({
      ...opt,
      id: optionIdMap.get(opt.id)!,
    })),
    branches: q.branches?.map((b) => ({
      optionId: b.optionId ? optionIdMap.get(b.optionId) : undefined,
      nextQuestionId: b.nextQuestionId
        ? (questionIdMap.get(b.nextQuestionId) ?? null)
        : null,
    })),
  }));

  const id = generateId();
  const createdAt = new Date().toISOString();

  const survey: Survey = {
    id,
    expertId,
    title: `${source.title} (Copy)`,
    description: source.description,
    contactInfo: source.contactInfo,
    questions: newQuestions,
    status: "draft",
    createdAt,
  };

  const item: DynamoDBSurveyItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.SURVEY(createdAt, id),
    entityType: EntityType.SURVEY,
    tenantId,
    ...survey,
  };

  await docClient.send(new PutCommand({ TableName: Tables.CORE, Item: item }));
  console.log(
    `[DBG][surveyRepository] Duplicated survey ${sourceSurveyId} → ${id}`,
  );
  return survey;
}

/* ─────────────────── Survey Responses ─────────────────── */

/**
 * Submit a survey response
 */
export async function submitSurveyResponse(
  tenantId: string,
  surveyId: string,
  data: {
    expertId: string;
    answers: SurveyAnswer[];
    contactInfo?: SurveyResponseContactInfo;
    metadata?: SurveyResponseMetadata;
  },
): Promise<SurveyResponse> {
  const id = generateId();
  const now = new Date().toISOString();

  console.log(
    `[DBG][surveyRepository] Submitting response for survey ${surveyId} in tenant ${tenantId}`,
  );

  const resp: SurveyResponse = {
    id,
    surveyId,
    expertId: data.expertId,
    answers: data.answers,
    contactInfo: data.contactInfo,
    submittedAt: now,
    createdAt: now,
    metadata: data.metadata,
  };

  const item: DynamoDBResponseItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.SURVEY_RESPONSE(surveyId, now, id),
    entityType: EntityType.SURVEY_RESPONSE,
    ...resp,
  };

  await docClient.send(new PutCommand({ TableName: Tables.CORE, Item: item }));

  // Increment response count on the survey
  // Best-effort — won't fail the response submission
  try {
    const survey = await getSurveyById(tenantId, surveyId);
    if (survey?.createdAt) {
      await docClient.send(
        new UpdateCommand({
          TableName: Tables.CORE,
          Key: {
            PK: TenantPK.TENANT(tenantId),
            SK: TenantPK.SURVEY(survey.createdAt, surveyId),
          },
          UpdateExpression:
            "SET responseCount = if_not_exists(responseCount, :zero) + :one",
          ExpressionAttributeValues: { ":zero": 0, ":one": 1 },
        }),
      );
    }
  } catch (err) {
    console.error(
      "[DBG][surveyRepository] Failed to increment responseCount:",
      err,
    );
  }

  console.log(`[DBG][surveyRepository] Response ${id} submitted`);
  return resp;
}

/**
 * Get all responses for a survey (newest first)
 */
export async function getSurveyResponses(
  tenantId: string,
  surveyId: string,
): Promise<SurveyResponse[]> {
  console.log(
    `[DBG][surveyRepository] Getting responses for survey ${surveyId} in tenant ${tenantId}`,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.SURVEY_RESPONSE_PREFIX(surveyId),
      },
      ScanIndexForward: false,
    }),
  );

  const items = (result.Items || []).map((item) =>
    toResponse(item as DynamoDBResponseItem),
  );
  console.log(`[DBG][surveyRepository] Found ${items.length} responses`);
  return items;
}
