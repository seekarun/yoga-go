/**
 * /api/data/app/inbox/drafts
 * GET - List all drafts
 * POST - Create a new draft
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { listDrafts, createDraft } from "@/lib/repositories/draftRepository";
import type { NextRequest } from "next/server";
import type { EmailAddress, EmailAttachment } from "@/types";

export async function GET() {
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

    const result = await listDrafts(tenant.id);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[DBG][drafts] Error listing drafts:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

interface CreateDraftBody {
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

    const body: CreateDraftBody = await request.json();
    const draftId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const draft = await createDraft(tenant.id, {
      id: draftId,
      expertId: tenant.id,
      to: body.to || [],
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject || "",
      bodyText: body.bodyText || "",
      bodyHtml: body.bodyHtml,
      attachments: body.attachments,
      mode: body.mode || "compose",
      replyToEmailId: body.replyToEmailId,
      forwardOfEmailId: body.forwardOfEmailId,
    });

    console.log("[DBG][drafts] Created draft:", draftId);

    return NextResponse.json({
      success: true,
      data: draft,
    });
  } catch (error) {
    console.error("[DBG][drafts] Error creating draft:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
