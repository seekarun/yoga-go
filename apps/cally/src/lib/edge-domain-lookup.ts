/**
 * Edge-compatible domain lookup for middleware
 *
 * Middleware runs in Edge Runtime which doesn't support the full DynamoDB
 * Document Client (Node.js APIs). This module uses the low-level
 * DynamoDBClient with a custom request handler that avoids Edge Runtime
 * header validation issues.
 *
 * Vercel strips AWS_* env vars from Edge functions, so we use EDGE_AWS_*
 * prefixed vars and pass credentials explicitly.
 */
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import type { HttpHandlerOptions, RequestHandlerOutput } from "@smithy/types";
import type { HttpRequest, HttpResponse } from "@smithy/protocol-http";
import { buildQueryString } from "@smithy/querystring-builder";

const TABLE_NAME = "yoga-go-core";
const REGION = process.env.EDGE_AWS_REGION || "ap-southeast-2";

// In-memory cache: domain → { tenantId, expiresAt }
const cache = new Map<string, { tenantId: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let client: DynamoDBClient | null = null;

/**
 * Minimal Edge-safe HTTP handler for AWS SDK.
 *
 * The default FetchHttpHandler passes headers through `new Headers()`,
 * which in Vercel Edge Runtime rejects values containing \r\n.
 * This handler passes headers as a plain Record to fetch(), bypassing
 * the Headers constructor entirely.
 */
class EdgeSafeHandler {
  async handle(
    request: HttpRequest,
    _options?: HttpHandlerOptions,
  ): Promise<RequestHandlerOutput<HttpResponse>> {
    let path = request.path;
    const qs = buildQueryString(request.query || {});
    if (qs) path += `?${qs}`;

    const { port, method } = request;
    const url = `${request.protocol}//${request.hostname}${port ? `:${port}` : ""}${path}`;
    const body =
      method === "GET" || method === "HEAD" ? undefined : request.body;

    // Pass headers as plain object — avoids Edge Runtime's strict Headers constructor
    const response = await fetch(url, {
      method,
      headers: request.headers as Record<string, string>,
      body,
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      response: {
        statusCode: response.status,
        reason: response.statusText,
        headers: responseHeaders,
        body: response.body,
      } as HttpResponse,
    };
  }

  updateHttpClientConfig() {}
  httpHandlerConfigs() {
    return {};
  }
  destroy() {}
}

function getClient(): DynamoDBClient {
  if (!client) {
    const accessKeyId = process.env.EDGE_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.EDGE_AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "EDGE_AWS_ACCESS_KEY_ID and EDGE_AWS_SECRET_ACCESS_KEY must be set",
      );
    }

    client = new DynamoDBClient({
      region: REGION,
      credentials: { accessKeyId, secretAccessKey },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- EdgeSafeHandler implements the HttpHandler interface but TypeScript can't infer it
      requestHandler: new EdgeSafeHandler() as any,
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
