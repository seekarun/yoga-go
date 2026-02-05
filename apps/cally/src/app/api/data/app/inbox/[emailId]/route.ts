/**
 * /api/data/app/inbox/[emailId]
 * GET - Get single email
 * PATCH - Update email status (read/starred)
 * DELETE - Soft delete email
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  findEmailById,
  updateEmailStatus,
  deleteEmail,
  getEmailThread,
} from "@/lib/repositories/emailRepository";
import type { EmailWithThread } from "@/types";

interface RouteParams {
  params: Promise<{
    emailId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const cognitoSub = session.user.cognitoSub;
    const { emailId } = await params;

    console.log("[DBG][inbox/emailId] Getting email:", emailId);

    // Get tenant for this user
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Find the email
    const email = await findEmailById(emailId, tenant.id);
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email not found" },
        { status: 404 },
      );
    }

    // If email is part of a thread, get all thread messages
    let emailWithThread: EmailWithThread = email;
    if (email.threadId) {
      const threadMessages = await getEmailThread(email.threadId);
      emailWithThread = {
        ...email,
        threadCount: threadMessages.length,
        threadMessages,
      };
    }

    console.log("[DBG][inbox/emailId] Found email:", emailId);

    return NextResponse.json({
      success: true,
      data: emailWithThread,
    });
  } catch (error) {
    console.error("[DBG][inbox/emailId] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const cognitoSub = session.user.cognitoSub;
    const { emailId } = await params;

    console.log("[DBG][inbox/emailId] Updating email:", emailId);

    // Get tenant for this user
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Find the email to get receivedAt for the SK
    const existingEmail = await findEmailById(emailId, tenant.id);
    if (!existingEmail) {
      return NextResponse.json(
        { success: false, error: "Email not found" },
        { status: 404 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { isRead, isStarred } = body;

    const updatedEmail = await updateEmailStatus(
      emailId,
      tenant.id,
      existingEmail.receivedAt,
      { isRead, isStarred },
    );

    console.log("[DBG][inbox/emailId] Updated email:", emailId);

    return NextResponse.json({
      success: true,
      data: updatedEmail,
    });
  } catch (error) {
    console.error("[DBG][inbox/emailId] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const cognitoSub = session.user.cognitoSub;
    const { emailId } = await params;

    console.log("[DBG][inbox/emailId] Deleting email:", emailId);

    // Get tenant for this user
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Find the email to get receivedAt for the SK
    const existingEmail = await findEmailById(emailId, tenant.id);
    if (!existingEmail) {
      return NextResponse.json(
        { success: false, error: "Email not found" },
        { status: 404 },
      );
    }

    await deleteEmail(
      emailId,
      tenant.id,
      existingEmail.receivedAt,
      existingEmail.threadId,
    );

    console.log("[DBG][inbox/emailId] Deleted email:", emailId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("[DBG][inbox/emailId] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
