/**
 * POST /api/data/app/subscribers/email
 * Send a broadcast email to selected users (one email per recipient)
 */

import { NextResponse } from "next/server";
import { ulid } from "ulid";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { emailClient } from "@/lib/email";
import { getFromEmail } from "@/lib/email/bookingNotification";
import { createEmail } from "@/lib/repositories/emailRepository";

interface BroadcastRequest {
  emails: string[];
  subject: string;
  body: string;
}

interface BroadcastResult {
  sent: number;
  failed: number;
}

export async function POST(request: Request) {
  console.log("[DBG][broadcastEmail] POST called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<BroadcastResult>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<BroadcastResult>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as BroadcastRequest;
    const { emails, subject, body: emailBody } = body;

    if (!emails?.length || !subject?.trim() || !emailBody?.trim()) {
      return NextResponse.json<ApiResponse<BroadcastResult>>(
        {
          success: false,
          error: "emails, subject, and body are required",
        },
        { status: 400 },
      );
    }

    const fromFormatted = getFromEmail(tenant);
    // Parse raw email from "Name <email>" format
    const fromEmailMatch = fromFormatted.match(/<(.+)>/);
    const fromEmail = fromEmailMatch ? fromEmailMatch[1] : fromFormatted;
    const fromName = fromFormatted.replace(/<.+>/, "").trim();

    const htmlBody = emailBody.replace(/\n/g, "<br>");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0;">
                ${htmlBody}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #888;">
                ${tenant.name}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    let sent = 0;
    let failed = 0;

    for (const recipientEmail of emails) {
      try {
        await emailClient.sendEmail({
          to: recipientEmail,
          from: fromFormatted,
          subject,
          text: emailBody,
          html,
          tags: [
            { Name: "EmailType", Value: "broadcast" },
            { Name: "TenantId", Value: tenant.id },
          ],
        });

        // Persist the sent email in DB
        const emailId = ulid();
        await createEmail({
          id: emailId,
          expertId: tenant.id,
          messageId: `broadcast-${emailId}`,
          from: { name: fromName, email: fromEmail },
          to: [{ email: recipientEmail }],
          subject,
          bodyText: emailBody,
          bodyHtml: html,
          attachments: [],
          receivedAt: new Date().toISOString(),
          isOutgoing: true,
          status: "sent",
        });

        sent++;
        console.log(`[DBG][broadcastEmail] Sent to ${recipientEmail}`);
      } catch (error) {
        failed++;
        console.error(
          `[DBG][broadcastEmail] Failed to send to ${recipientEmail}:`,
          error,
        );
      }
    }

    console.log(
      `[DBG][broadcastEmail] Broadcast complete: ${sent} sent, ${failed} failed`,
    );

    return NextResponse.json<ApiResponse<BroadcastResult>>({
      success: true,
      data: { sent, failed },
    });
  } catch (error) {
    console.error("[DBG][broadcastEmail] Error:", error);
    return NextResponse.json<ApiResponse<BroadcastResult>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send emails",
      },
      { status: 500 },
    );
  }
}
