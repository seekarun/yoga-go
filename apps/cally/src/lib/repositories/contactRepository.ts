/**
 * Contact Repository for CallyGo - DynamoDB Operations
 *
 * Storage pattern:
 * - PK="TENANT#{tenantId}", SK="CONTACT#{timestamp}#{contactId}"
 *
 * Queries:
 * - List all contacts: Query PK, SK begins_with "CONTACT#"
 * - Filter by email: Query + FilterExpression on email attribute
 */

import {
  PutCommand,
  QueryCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, TenantPK, EntityType } from "../dynamodb";
import type { ContactSubmission } from "@/types";
import type { VisitorInfo } from "@core/types";

/**
 * DynamoDB item type (includes PK/SK keys)
 */
interface DynamoDBContactItem extends ContactSubmission {
  PK: string;
  SK: string;
  entityType: string;
}

/**
 * Strip DynamoDB keys from item to return clean ContactSubmission
 */
function toContact(item: DynamoDBContactItem): ContactSubmission {
  const { PK: _PK, SK: _SK, entityType: _entityType, ...contact } = item;
  return contact;
}

/**
 * Generate a short random ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Create a contact submission for a tenant
 */
export async function createContact(
  tenantId: string,
  data: {
    name: string;
    email: string;
    message: string;
    flaggedAsSpam?: boolean;
    emailValidationReason?: string;
    visitorInfo?: VisitorInfo;
    formId?: string;
    formFields?: Record<string, string>;
  },
): Promise<ContactSubmission> {
  const id = generateId();
  const submittedAt = new Date().toISOString();

  console.log(
    `[DBG][contactRepository] Creating contact ${data.email} for tenant ${tenantId}`,
  );

  const contact: ContactSubmission = {
    id,
    email: data.email,
    name: data.name,
    message: data.message,
    submittedAt,
    ...(data.flaggedAsSpam !== undefined && {
      flaggedAsSpam: data.flaggedAsSpam,
    }),
    ...(data.emailValidationReason && {
      emailValidationReason: data.emailValidationReason,
    }),
    ...(data.visitorInfo && { visitorInfo: data.visitorInfo }),
    ...(data.formId && { formId: data.formId }),
    ...(data.formFields && { formFields: data.formFields }),
  };

  const item: DynamoDBContactItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.CONTACT(submittedAt, id),
    entityType: EntityType.CONTACT,
    ...contact,
  };

  const command = new PutCommand({
    TableName: Tables.CORE,
    Item: item,
  });

  await docClient.send(command);
  console.log(
    `[DBG][contactRepository] Created contact ${id} from ${data.email}`,
  );
  return contact;
}

/**
 * Get all contacts for a tenant, sorted by submittedAt desc (newest first)
 * SK pattern CONTACT#{timestamp}#{id} gives chronological order by default
 */
export async function getContactsByTenant(
  tenantId: string,
): Promise<ContactSubmission[]> {
  console.log(
    `[DBG][contactRepository] Getting all contacts for tenant ${tenantId}`,
  );

  const command = new QueryCommand({
    TableName: Tables.CORE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": TenantPK.TENANT(tenantId),
      ":skPrefix": TenantPK.CONTACT_PREFIX,
    },
    ScanIndexForward: false, // newest first
  });

  const result = await docClient.send(command);
  const contacts = (result.Items || []).map((item) =>
    toContact(item as DynamoDBContactItem),
  );

  console.log(`[DBG][contactRepository] Found ${contacts.length} contacts`);
  return contacts;
}

/**
 * Batch create contacts for a tenant (used by contact import)
 * Skips contacts whose email already exists as a contact
 */
export async function createContactsBatch(
  tenantId: string,
  contacts: { name: string; email: string; message: string }[],
): Promise<{ created: number; skipped: number }> {
  console.log(
    `[DBG][contactRepository] Batch creating ${contacts.length} contacts for tenant ${tenantId}`,
  );

  const BATCH_SIZE = 25;
  let created = 0;

  const existing = await getContactsByTenant(tenantId);
  const existingEmails = new Set(
    existing.map((c) => c.email.toLowerCase().trim()),
  );

  const newContacts = contacts.filter(
    (c) => !existingEmails.has(c.email.toLowerCase().trim()),
  );
  const skipped = contacts.length - newContacts.length;

  for (let i = 0; i < newContacts.length; i += BATCH_SIZE) {
    const batch = newContacts.slice(i, i + BATCH_SIZE);
    const putRequests = batch.map((contact) => {
      const id = generateId();
      const submittedAt = new Date().toISOString();
      return {
        PutRequest: {
          Item: {
            PK: TenantPK.TENANT(tenantId),
            SK: TenantPK.CONTACT(submittedAt, id),
            entityType: EntityType.CONTACT,
            id,
            email: contact.email.toLowerCase().trim(),
            name: contact.name.trim(),
            message: contact.message,
            submittedAt,
          },
        },
      };
    });

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: { [Tables.CORE]: putRequests },
      }),
    );
    created += batch.length;
  }

  console.log(
    `[DBG][contactRepository] Batch created ${created}, skipped ${skipped} duplicates`,
  );
  return { created, skipped };
}

/**
 * Get contacts for a specific email within a tenant
 */
export async function getContactsByEmail(
  tenantId: string,
  email: string,
): Promise<ContactSubmission[]> {
  console.log(
    `[DBG][contactRepository] Getting contacts for ${email} in tenant ${tenantId}`,
  );

  const command = new QueryCommand({
    TableName: Tables.CORE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    FilterExpression: "email = :email",
    ExpressionAttributeValues: {
      ":pk": TenantPK.TENANT(tenantId),
      ":skPrefix": TenantPK.CONTACT_PREFIX,
      ":email": email.toLowerCase().trim(),
    },
    ScanIndexForward: false,
  });

  const result = await docClient.send(command);
  const contacts = (result.Items || []).map((item) =>
    toContact(item as DynamoDBContactItem),
  );

  console.log(
    `[DBG][contactRepository] Found ${contacts.length} contacts for ${email}`,
  );
  return contacts;
}
