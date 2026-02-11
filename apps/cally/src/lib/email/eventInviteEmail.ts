/**
 * Event Invite Email
 * Sent to attendees when they are added to a calendar event.
 * Fire-and-forget — errors are caught internally.
 */
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import { emailClient } from "./index";
import { getFromEmail, formatTime } from "./bookingNotification";

export interface EventInviteEmailData {
  attendeeName: string;
  attendeeEmail: string;
  eventTitle: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  tenant: CallyTenant;
}

/**
 * Send an event invite email to an attendee.
 * Errors are caught internally so they don't break the API response.
 */
export async function sendEventInviteEmail(
  data: EventInviteEmailData,
): Promise<void> {
  const {
    attendeeName,
    attendeeEmail,
    eventTitle,
    startTime,
    endTime,
    tenant,
  } = data;

  const timezone = tenant.bookingConfig?.timezone || "Australia/Sydney";
  const from = getFromEmail(tenant);
  const start = formatTime(startTime, timezone);
  const end = formatTime(endTime, timezone);

  try {
    console.log(
      `[DBG][eventInviteEmail] Sending invite to ${attendeeEmail} for "${eventTitle}"`,
    );

    const subject = `You're invited: ${eventTitle} — ${start.dateStr}`;

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
          <!-- Header -->
          <tr>
            <td style="background: #6366f1; padding: 25px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
                Event Invitation
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                Hi ${attendeeName},
              </p>

              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                <strong>${tenant.name}</strong> has invited you to an event: <strong>${eventTitle}</strong>.
              </p>

              <!-- Event Details -->
              <div style="background: #eef2ff; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #3730a3; font-size: 16px;">Event Details</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #666; width: 100px;">Event</td>
                    <td style="padding: 6px 0; color: #333; font-weight: 500;">${eventTitle}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #666;">Date</td>
                    <td style="padding: 6px 0; color: #333; font-weight: 500;">${start.dateStr}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #666;">Time</td>
                    <td style="padding: 6px 0; color: #333; font-weight: 500;">${start.timeStr} – ${end.timeStr}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #666;">Timezone</td>
                    <td style="padding: 6px 0; color: #333;">${timezone}</td>
                  </tr>
                </table>
              </div>

              <p style="font-size: 13px; color: #999; margin: 0; text-align: center;">
                This is an automated invitation from ${tenant.name}.
              </p>
            </td>
          </tr>

          <!-- Footer -->
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

    const text = `Hi ${attendeeName},

${tenant.name} has invited you to an event: ${eventTitle}.

EVENT DETAILS
Event: ${eventTitle}
Date: ${start.dateStr}
Time: ${start.timeStr} – ${end.timeStr}
Timezone: ${timezone}

This is an automated invitation from ${tenant.name}.

---
${tenant.name}`;

    await emailClient.sendEmail({
      to: attendeeEmail,
      from,
      subject,
      text,
      html,
      tags: [
        { Name: "EmailType", Value: "event-invite" },
        { Name: "TenantId", Value: tenant.id },
      ],
    });

    console.log(`[DBG][eventInviteEmail] Invite sent to ${attendeeEmail}`);
  } catch (error) {
    console.error(
      "[DBG][eventInviteEmail] Failed to send invite email:",
      error,
    );
  }
}
