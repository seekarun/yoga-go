/**
 * Edge-compatible domain lookup for middleware
 *
 * Uses raw fetch + manual AWS Signature V4 signing to call DynamoDB.
 * This avoids the AWS SDK's FetchHttpHandler which creates Headers objects
 * that Vercel Edge Runtime rejects due to multi-line header values.
 *
 * Vercel strips AWS_* env vars from Edge functions, so we use EDGE_AWS_*
 * prefixed vars.
 */

const TABLE_NAME = "yoga-go-core";
const REGION = process.env.EDGE_AWS_REGION || "ap-southeast-2";
const SERVICE = "dynamodb";

// In-memory cache: domain → { tenantId, expiresAt }
const cache = new Map<string, { tenantId: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// --- AWS Signature V4 helpers using Web Crypto API ---

const encoder = new TextEncoder();

async function hmacSHA256(
  key: ArrayBuffer,
  message: string,
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return bufToHex(hash);
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  const kDate = await hmacSHA256(
    encoder.encode("AWS4" + secretKey).buffer as ArrayBuffer,
    dateStamp,
  );
  const kRegion = await hmacSHA256(kDate, region);
  const kService = await hmacSHA256(kRegion, service);
  return hmacSHA256(kService, "aws4_request");
}

/**
 * Make a signed request to DynamoDB using AWS Signature V4.
 */
async function dynamoDBRequest(
  body: string,
  target: string,
): Promise<Record<string, unknown>> {
  const accessKeyId = process.env.EDGE_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.EDGE_AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "EDGE_AWS_ACCESS_KEY_ID and EDGE_AWS_SECRET_ACCESS_KEY must be set",
    );
  }

  const host = `dynamodb.${REGION}.amazonaws.com`;
  const url = `https://${host}/`;
  const now = new Date();
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256Hex(body);

  // Canonical headers — must be sorted by lowercase header name
  const canonicalHeaders =
    `content-type:application/x-amz-json-1.0\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:DynamoDB_20120810.${target}\n`;

  const signedHeaders = "content-type;host;x-amz-date;x-amz-target";

  const canonicalRequest = [
    "POST",
    "/",
    "", // query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSignatureKey(
    secretAccessKey,
    dateStamp,
    REGION,
    SERVICE,
  );
  const signatureBuf = await hmacSHA256(signingKey, stringToSign);
  const signature = bufToHex(signatureBuf);

  // Build Authorization header as a single line — no newlines
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.0",
      "X-Amz-Date": amzDate,
      "X-Amz-Target": `DynamoDB_20120810.${target}`,
      Authorization: authorization,
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `DynamoDB ${target} failed (${response.status}): ${errorBody}`,
    );
  }

  return response.json();
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
    const result = await dynamoDBRequest(
      JSON.stringify({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: `TENANT#DOMAIN#${normalizedDomain}` },
          SK: { S: normalizedDomain },
        },
        ProjectionExpression: "tenantId",
      }),
      "GetItem",
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw DynamoDB JSON response
    const item = result.Item as any;
    if (!item?.tenantId?.S) {
      console.log(
        "[DBG][edge-domain-lookup] No tenant found for domain:",
        normalizedDomain,
      );
      return null;
    }

    const tenantId = item.tenantId.S as string;

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
