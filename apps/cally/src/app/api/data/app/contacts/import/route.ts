/**
 * POST /api/data/app/contacts/import
 * Batch import contacts for the authenticated tenant
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { createContactsBatch } from "@/lib/repositories/contactRepository";

interface ImportResult {
  created: number;
  skipped: number;
}

export async function POST(request: Request) {
  console.log("[DBG][contacts-import] POST called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { contacts } = body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No contacts provided" },
        { status: 400 },
      );
    }

    const valid = contacts.every(
      (c: { name?: string; email?: string }) =>
        c.email?.trim() && c.name?.trim(),
    );
    if (!valid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Each contact must have a name and email" },
        { status: 400 },
      );
    }

    const result = await createContactsBatch(tenant.id, contacts);

    console.log(
      `[DBG][contacts-import] Imported ${result.created}, skipped ${result.skipped}`,
    );

    return NextResponse.json<ApiResponse<ImportResult>>({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[DBG][contacts-import] Error:", err);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to import contacts" },
      { status: 500 },
    );
  }
}
