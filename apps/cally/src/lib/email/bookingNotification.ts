/**
 * Booking Notification Email
 * Sent to the visitor after a booking request is submitted (pending confirmation)
 */
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import { emailClient, FALLBACK_FROM_EMAIL } from "./index";

export interface BookingNotificationData {
  visitorName: string;
  visitorEmail: string;
  note?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  date: string; // YYYY-MM-DD
  tenant: CallyTenant;
}

/**
 * Get the from email for a tenant
 * Uses the tenant's verified domain email if available, else platform fallback
 */
function getFromEmail(tenant: CallyTenant): string {
  if (
    tenant.emailConfig?.sesVerificationStatus === "verified" &&
    tenant.emailConfig.domainEmail
  ) {
    return `${tenant.name} <${tenant.emailConfig.domainEmail}>`;
  }
  return `${tenant.name} <${FALLBACK_FROM_EMAIL}>`;
}

/**
 * Format time for display in email
 */
function formatTime(
  isoString: string,
  timezone: string,
): { dateStr: string; timeStr: string } {
  const d = new Date(isoString);
  return {
    dateStr: d.toLocaleDateString("en-US", {
      timeZone: timezone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    timeStr: d.toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

/**
 * Send a booking notification email to the visitor
 * This is fire-and-forget — errors are caught internally so they don't break the API response
 */
export async function sendBookingNotificationEmail(
  data: BookingNotificationData,
): Promise<void> {
  const { visitorName, visitorEmail, note, startTime, endTime, tenant } = data;

  const timezone = tenant.bookingConfig?.timezone || "Australia/Sydney";
  const from = getFromEmail(tenant);
  const start = formatTime(startTime, timezone);
  const end = formatTime(endTime, timezone);

  try {
    console.log(
      `[DBG][bookingNotification] Sending booking notification to ${visitorEmail}`,
    );

    const subject = `Booking request received — ${start.dateStr}`;

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
            <td style="background: #f59e0b; padding: 25px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
                Booking Request Received
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                Hi ${visitorName},
              </p>

              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                Thank you for your booking request with <strong>${tenant.name}</strong>. Your request is <strong>pending confirmation</strong>.
              </p>

              <p style="font-size: 14px; color: #666; margin: 0 0 25px 0;">
                You will receive another email once your booking is confirmed.
              </p>

              <!-- Booking Details -->
              <div style="background: #fffbeb; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 16px;">Booking Details</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #666; width: 100px;">Date</td>
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
                  ${
                    note
                      ? `<tr>
                    <td style="padding: 6px 0; color: #666; vertical-align: top;">Note</td>
                    <td style="padding: 6px 0; color: #333;">${note}</td>
                  </tr>`
                      : ""
                  }
                </table>
              </div>

              <!-- Status Badge -->
              <div style="text-align: center; margin-bottom: 25px;">
                <span style="display: inline-block; background: #fef3c7; color: #92400e; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                  Pending Confirmation
                </span>
              </div>

              <p style="font-size: 13px; color: #999; margin: 0; text-align: center;">
                If you did not make this request, you can safely ignore this email.
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

    const text = `Hi ${visitorName},

Thank you for your booking request with ${tenant.name}. Your request is pending confirmation.

You will receive another email once your booking is confirmed.

BOOKING DETAILS
Date: ${start.dateStr}
Time: ${start.timeStr} – ${end.timeStr}
Timezone: ${timezone}${note ? `\nNote: ${note}` : ""}

Status: Pending Confirmation

If you did not make this request, you can safely ignore this email.

---
${tenant.name}`;

    await emailClient.sendEmail({
      to: visitorEmail,
      from,
      subject,
      text,
      html,
      tags: [
        { Name: "EmailType", Value: "booking-notification" },
        { Name: "TenantId", Value: tenant.id },
      ],
    });

    console.log(
      `[DBG][bookingNotification] Booking notification sent to ${visitorEmail}`,
    );
  } catch (error) {
    // Catch errors internally — email failure must not break the booking API response
    console.error(
      "[DBG][bookingNotification] Failed to send booking notification:",
      error,
    );
  }
}
