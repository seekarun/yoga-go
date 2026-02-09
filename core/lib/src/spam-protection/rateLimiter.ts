import type { SpamCheckResult } from "@core/types";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getDocClient } from "../dynamodb/client";

/**
 * DynamoDB-based rate limiter using atomic counters.
 * PK: RATELIMIT#{ip}, SK: WINDOW#{windowBucket}
 * Fails open on DynamoDB errors (allows the request through).
 */
export async function checkRateLimit(
  ip: string,
  tableName: string,
  maxRequests: number,
  windowMinutes: number,
): Promise<SpamCheckResult | null> {
  const windowMs = windowMinutes * 60 * 1000;
  const windowBucket = Math.floor(Date.now() / windowMs);
  const ttl = Math.floor((windowBucket + 1) * (windowMs / 1000)) + 3600; // window end + 1hr buffer

  try {
    const docClient = getDocClient();
    const result = await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `RATELIMIT#${ip}`,
          SK: `WINDOW#${windowBucket}`,
        },
        UpdateExpression:
          "SET #count = if_not_exists(#count, :zero) + :one, #ttl = :ttl",
        ExpressionAttributeNames: {
          "#count": "requestCount",
          "#ttl": "ttl",
        },
        ExpressionAttributeValues: {
          ":zero": 0,
          ":one": 1,
          ":ttl": ttl,
        },
        ReturnValues: "ALL_NEW",
      }),
    );

    const count = (result.Attributes?.requestCount as number) ?? 1;
    const remaining = Math.max(0, maxRequests - count);

    if (count > maxRequests) {
      console.log(
        `[DBG][spam-protection] Rate limit exceeded for IP ${ip}: ${count}/${maxRequests}`,
      );
      return { passed: false, reason: "rate_limited", remaining: 0 };
    }

    return { passed: true, remaining } as SpamCheckResult;
  } catch (error) {
    // Fail open — allow the request on DynamoDB error
    console.error(
      "[DBG][spam-protection] Rate limit check failed, allowing request:",
      error,
    );
    return null;
  }
}
