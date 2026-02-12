/**
 * Admin API: Delete all data for a tenant
 * POST /api/supa/delete-tenant
 * Localhost only (enforced by middleware + defense-in-depth check)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { deleteTenantData } from "@/lib/admin";

const LOG_PREFIX = "[DBG][api/supa/delete-tenant]";

function isLocalhost(request: NextRequest): boolean {
  const hostname = request.headers.get("host") || "";
  const host = hostname.split(":")[0];
  return host === "localhost" || host === "127.0.0.1";
}

export async function POST(request: NextRequest) {
  // Defense-in-depth: double-check localhost
  if (!isLocalhost(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId || typeof tenantId !== "string") {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 },
      );
    }

    console.log(`${LOG_PREFIX} Deleting tenant: ${tenantId}`);

    const result = await deleteTenantData(tenantId);

    console.log(
      `${LOG_PREFIX} Deletion complete. Total deleted: ${result.totalDeleted}`,
    );

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error deleting tenant:`, error);
    return NextResponse.json(
      { error: "Failed to delete tenant" },
      { status: 500 },
    );
  }
}
