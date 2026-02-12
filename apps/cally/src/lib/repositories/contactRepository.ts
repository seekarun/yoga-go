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

import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
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
