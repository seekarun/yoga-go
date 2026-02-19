/**
 * /api/data/app/inbox/drafts/[draftId]
 * GET - Get a draft
 * PUT - Update a draft
 * DELETE - Delete a draft
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getDraftById,
  updateDraft,
  deleteDraft,
} from "@/lib/repositories/draftRepository";
import type { EmailAddress, EmailAttachment } from "@/types";

interface RouteParams {
  params: Promise<{
    draftId: string;
  }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    const { draftId } = await params;
    const draft = await getDraftById(tenant.id, draftId);

    if (!draft) {
      return NextResponse.json(
        { success: false, error: "Draft not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: draft,
    });
  } catch (error) {
    console.error("[DBG][drafts] Error getting draft:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

interface UpdateDraftBody {
  to?: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  attachments?: EmailAttachment[];
  mode?: "compose" | "reply" | "reply-all" | "forward";
  replyToEmailId?: string;
  forwardOfEmailId?: string;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const { draftId } = await params;
    const body: UpdateDraftBody = await request.json();

    const updated = await updateDraft(tenant.id, draftId, body);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Draft not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[DBG][drafts] Error updating draft:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

    const { draftId } = await params;
    await deleteDraft(tenant.id, draftId);

    return NextResponse.json({
      success: true,
      message: "Draft deleted",
    });
  } catch (error) {
    console.error("[DBG][drafts] Error deleting draft:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
