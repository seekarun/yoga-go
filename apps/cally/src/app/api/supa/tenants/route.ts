/**
 * Admin API: List all tenants
 * GET /api/supa/tenants
 * Localhost only (enforced by middleware + defense-in-depth check)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, EntityType } from "@/lib/dynamodb";

const LOG_PREFIX = "[DBG][api/supa/tenants]";

function isLocalhost(request: NextRequest): boolean {
  const hostname = request.headers.get("host") || "";
  const host = hostname.split(":")[0];
  return host === "localhost" || host === "127.0.0.1";
}

export async function GET(request: NextRequest) {
  // Defense-in-depth: double-check localhost
  if (!isLocalhost(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    console.log(`${LOG_PREFIX} Scanning for all tenants`);

    const result = await docClient.send(
      new ScanCommand({
        TableName: Tables.CORE,
        FilterExpression: "entityType = :entityType",
        ExpressionAttributeValues: {
          ":entityType": EntityType.TENANT,
        },
        ProjectionExpression:
          "id, #n, email, createdAt, subscriptionConfig, avatar",
        ExpressionAttributeNames: {
          "#n": "name",
        },
      }),
    );

    const tenants = (result.Items || []).map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      avatar: item.avatar,
      createdAt: item.createdAt,
      subscriptionTier: item.subscriptionConfig?.tier || "free",
      subscriptionStatus: item.subscriptionConfig?.status || "none",
    }));

    // Sort by createdAt descending (newest first)
    tenants.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    console.log(`${LOG_PREFIX} Found ${tenants.length} tenants`);
    return NextResponse.json({ tenants });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error scanning tenants:`, error);
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 },
    );
  }
}
