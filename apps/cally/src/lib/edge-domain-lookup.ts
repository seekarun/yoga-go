/**
 * Edge-compatible domain lookup for middleware
 *
 * Middleware runs in Edge Runtime which doesn't support the full DynamoDB
 * Document Client (Node.js APIs). This module uses the low-level
 * DynamoDBClient with FetchHttpHandler instead.
 */
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { FetchHttpHandler } from "@smithy/fetch-http-handler";

const TABLE_NAME = "yoga-go-core";
const REGION = process.env.AWS_REGION || "ap-southeast-2";

// In-memory cache: domain → { tenantId, expiresAt }
const cache = new Map<string, { tenantId: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let client: DynamoDBClient | null = null;

function getClient(): DynamoDBClient {
  if (!client) {
    client = new DynamoDBClient({
      region: REGION,
      requestHandler: new FetchHttpHandler(),
    });
  }
  return client;
}

/**
 * Look up the tenantId for a custom domain.
 * Uses the same PK/SK pattern as createDomainLookup in tenantRepository:
 *   PK = TENANT#DOMAIN#{domain}, SK = {domain}
 */
export async function lookupTenantByDomain(
  domain: string,
): Promise<string | null> {
  const normalizedDomain = domain.toLowerCase();

  // Check cache first
  const cached = cache.get(normalizedDomain);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tenantId;
  }

  try {
    const result = await getClient().send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: `TENANT#DOMAIN#${normalizedDomain}` },
          SK: { S: normalizedDomain },
        },
        ProjectionExpression: "tenantId",
      }),
    );

    if (!result.Item?.tenantId?.S) {
      console.log(
        "[DBG][edge-domain-lookup] No tenant found for domain:",
        normalizedDomain,
      );
      return null;
    }

    const tenantId = result.Item.tenantId.S;

    // Cache the result
    cache.set(normalizedDomain, {
      tenantId,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    console.log(
      "[DBG][edge-domain-lookup] Found tenant:",
      tenantId,
      "for domain:",
      normalizedDomain,
    );
    return tenantId;
  } catch (error) {
    console.error(
      "[DBG][edge-domain-lookup] Error looking up domain:",
      normalizedDomain,
      error,
    );
    return null;
  }
}
