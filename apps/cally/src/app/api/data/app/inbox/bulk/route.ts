/**
 * POST /api/data/app/inbox/bulk
 * Perform bulk actions on multiple emails
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  bulkUpdateEmails,
  type BulkEmailAction,
} from "@/lib/repositories/emailRepository";

const VALID_ACTIONS: BulkEmailAction[] = [
  "markRead",
  "markUnread",
  "star",
  "unstar",
  "delete",
  "archive",
  "restore",
  "unarchive",
  "addLabel",
  "removeLabel",
];

const MAX_EMAILS = 50;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { emailIds, action, labelId } = body;

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "emailIds must be a non-empty array" },
        { status: 400 },
      );
    }

    if (emailIds.length > MAX_EMAILS) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_EMAILS} emails per bulk action`,
        },
        { status: 400 },
      );
    }

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action. Valid: ${VALID_ACTIONS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if ((action === "addLabel" || action === "removeLabel") && !labelId) {
      return NextResponse.json(
        { success: false, error: "labelId is required for label actions" },
        { status: 400 },
      );
    }

    console.log(
      "[DBG][inbox/bulk] Bulk action:",
      action,
      "on",
      emailIds.length,
      "emails",
    );

    const result = await bulkUpdateEmails(tenant.id, emailIds, action, labelId);

    console.log(
      "[DBG][inbox/bulk] Result:",
      result.success,
      "success,",
      result.failed,
      "failed",
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[DBG][inbox/bulk] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
