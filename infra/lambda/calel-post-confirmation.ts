/**
 * Calel Post-Confirmation Lambda
 *
 * Triggered by Cognito after user confirms their email.
 * Creates a tenant in DynamoDB for the new user.
 */

import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type {
  PostConfirmationTriggerEvent,
  PostConfirmationTriggerHandler,
} from 'aws-lambda';
import { randomBytes, createHash } from 'crypto';

const dynamoClient = new DynamoDBClient({});
const cognitoClient = new CognitoIdentityProviderClient({});
const TABLE_NAME = process.env.TABLE_NAME || 'calel-core';

/**
 * Generate a unique tenant ID
 */
function generateTenantId(): string {
  return `ten_${randomBytes(12).toString('hex')}`;
}

/**
 * Generate an API key with prefix
 */
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = `ck_${randomBytes(4).toString('hex')}`;
  const secret = randomBytes(24).toString('hex');
  const key = `${prefix}_${secret}`;
  const hash = createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
}

/**
 * Generate a URL-safe slug from email
 */
function generateSlug(email: string): string {
  const emailPart = email.split('@')[0];
  return emailPart
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Check if slug already exists
 */
async function isSlugTaken(slug: string): Promise<boolean> {
  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': { S: `TENANT#SLUG#${slug.toLowerCase()}` },
      },
      Limit: 1,
    }),
  );
  return (result.Items?.length ?? 0) > 0;
}

/**
 * Get a unique slug by appending numbers if needed
 */
async function getUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (await isSlugTaken(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    if (counter > 100) {
      // Fallback to random suffix
      slug = `${baseSlug}-${randomBytes(4).toString('hex')}`;
      break;
    }
  }

  return slug;
}

export const handler: PostConfirmationTriggerHandler = async (
  event: PostConfirmationTriggerEvent,
) => {
  console.log('[DBG][calel-post-confirmation] Event:', JSON.stringify(event));

  // Only process confirmation events (not forgot password, etc.)
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    console.log('[DBG][calel-post-confirmation] Skipping, not a signup confirmation');
    return event;
  }

  const { userPoolId, userName } = event;
  const email = event.request.userAttributes.email;
  const givenName = event.request.userAttributes.given_name || '';
  const familyName = event.request.userAttributes.family_name || '';

  console.log('[DBG][calel-post-confirmation] Creating tenant for:', email);

  try {
    // Generate IDs and keys
    const tenantId = generateTenantId();
    const { prefix: apiKeyPrefix, hash: apiKeyHash } = generateApiKey();
    const baseSlug = generateSlug(email);
    const slug = await getUniqueSlug(baseSlug);
    const now = new Date().toISOString();

    // Create tenant name from user's name or email
    const tenantName = givenName
      ? `${givenName}${familyName ? ' ' + familyName : ''}`
      : email.split('@')[0];

    // Create tenant record in DynamoDB
    await dynamoClient.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: { S: 'TENANT' },
          SK: { S: tenantId },
          GSI1PK: { S: `TENANT#SLUG#${slug.toLowerCase()}` },
          GSI1SK: { S: tenantId },
          entityType: { S: 'TENANT' },
          id: { S: tenantId },
          name: { S: tenantName },
          slug: { S: slug },
          apiKey: { S: apiKeyHash },
          apiKeyPrefix: { S: apiKeyPrefix },
          ownerEmail: { S: email.toLowerCase() },
          ownerCognitoSub: { S: userName },
          settings: {
            M: {
              defaultTimezone: { S: 'UTC' },
              allowPublicBooking: { BOOL: true },
              requireEmailVerification: { BOOL: false },
            },
          },
          status: { S: 'active' },
          createdAt: { S: now },
          updatedAt: { S: now },
        },
        ConditionExpression: 'attribute_not_exists(PK)',
      }),
    );

    console.log('[DBG][calel-post-confirmation] Tenant created:', tenantId);

    // Create API key lookup record
    await dynamoClient.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: { S: `APIKEY#${apiKeyPrefix}` },
          SK: { S: tenantId },
          GSI1PK: { S: `APIKEY#${apiKeyPrefix}` },
          GSI1SK: { S: tenantId },
          tenantId: { S: tenantId },
          apiKeyHash: { S: apiKeyHash },
          entityType: { S: 'API_KEY_LOOKUP' },
        },
      }),
    );

    console.log('[DBG][calel-post-confirmation] API key lookup created');

    // Update user's custom attributes with tenantId
    await cognitoClient.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: userPoolId,
        Username: userName,
        UserAttributes: [
          { Name: 'custom:tenantId', Value: tenantId },
          { Name: 'custom:tenantName', Value: tenantName },
        ],
      }),
    );

    console.log('[DBG][calel-post-confirmation] User attributes updated');
  } catch (error) {
    console.error('[DBG][calel-post-confirmation] Error:', error);
    // Don't throw - we don't want to fail the signup
    // The user can create a tenant later if this fails
  }

  return event;
};
