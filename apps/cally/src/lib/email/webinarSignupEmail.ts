/**
 * Webinar Signup Confirmation Email
 * Sent when a visitor registers for a webinar
 */
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import { emailClient } from "./index";
import { getFromEmail } from "./bookingNotification";

export interface WebinarSignupSession {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface WebinarSignupConfirmationData {
  visitorName: string;
  visitorEmail: string;
  webinarName: string;
  sessions: WebinarSignupSession[];
  tenant: CallyTenant;
  cancelUrl?: string;
  timezone: string;
}

/**
 * Format a date string (YYYY-MM-DD) into a friendly display string
 * e.g. "Saturday, March 15, 2025"
 */
function formatSessionDate(dateStr: string, timezone: string): string {
  // Parse YYYY-MM-DD as UTC noon to avoid timezone date-shift issues
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return d.toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a time string (HH:mm) into a friendly display string
 * e.g. "10:00 AM"
 */
function formatSessionTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Build the sessions HTML for the email — one row per session
 */
function buildSessionsHtml(
  sessions: WebinarSignupSession[],
  timezone: string,
): string {
  return sessions
    .map((session, index) => {
      const dateDisplay = formatSessionDate(session.date, timezone);
      const startDisplay = formatSessionTime(session.startTime);
      const endDisplay = formatSessionTime(session.endTime);
      const label = sessions.length > 1 ? `Session ${index + 1}` : "Date";

      return `<tr>
                    <td style="padding: 6px 0; color: #666; width: 100px; vertical-align: top;">${label}</td>
                    <td style="padding: 6px 0; color: #333; font-weight: 500;">
                      ${dateDisplay}<br>
                      <span style="font-weight: 400;">${startDisplay} – ${endDisplay}</span>
                    </td>
                  </tr>`;
    })
    .join("\n                  ");
}

/**
 * Build the sessions plain text for the email
 */
function buildSessionsText(
  sessions: WebinarSignupSession[],
  timezone: string,
): string {
  return sessions
    .map((session, index) => {
      const dateDisplay = formatSessionDate(session.date, timezone);
      const startDisplay = formatSessionTime(session.startTime);
      const endDisplay = formatSessionTime(session.endTime);
      const label = sessions.length > 1 ? `Session ${index + 1}` : "Date";

      return `${label}: ${dateDisplay}\nTime: ${startDisplay} – ${endDisplay}`;
    })
    .join("\n");
}

/**
 * Send a webinar signup confirmation email to the visitor
 * This is fire-and-forget — errors are caught internally so they don't break the API response
 */
export async function sendWebinarSignupConfirmationEmail(
  data: WebinarSignupConfirmationData,
): Promise<void> {
  const {
    visitorName,
    visitorEmail,
    webinarName,
    sessions,
    tenant,
    cancelUrl,
    timezone,
  } = data;

  const from = getFromEmail(tenant);

  try {
    console.log(
      `[DBG][webinarSignupEmail] Sending webinar signup confirmation to ${visitorEmail}`,
    );

    const subject = `You're registered — ${webinarName}`;

    const sessionsHtml = buildSessionsHtml(sessions, timezone);
    const sessionsText = buildSessionsText(sessions, timezone);

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
            <td style="background: #10b981; padding: 25px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
                You're Registered!
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
                You have successfully registered for <strong>${webinarName}</strong> with <strong>${tenant.name}</strong>.
              </p>

              <!-- Webinar Details -->
              <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 16px;">Webinar Schedule</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #666; width: 100px;">Webinar</td>
                    <td style="padding: 6px 0; color: #333; font-weight: 500;">${webinarName}</td>
                  </tr>
                  ${sessionsHtml}
                  <tr>
                    <td style="padding: 6px 0; color: #666;">Timezone</td>
                    <td style="padding: 6px 0; color: #333;">${timezone}</td>
                  </tr>
                </table>
              </div>

              <!-- Status Badge -->
              <div style="text-align: center; margin-bottom: 25px;">
                <span style="display: inline-block; background: #d1fae5; color: #065f46; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                  Registered
                </span>
              </div>

              <p style="font-size: 13px; color: #999; margin: 0; text-align: center;">
                We look forward to seeing you!
              </p>

              ${
                cancelUrl
                  ? `<!-- Cancel Registration Link -->
              <div style="border-top: 1px solid #e5e7eb; margin-top: 25px; padding-top: 20px; text-align: center;">
                <p style="font-size: 13px; color: #999; margin: 0 0 8px 0;">
                  Need to cancel?
                </p>
                <a href="${cancelUrl}" style="font-size: 13px; color: #dc2626; text-decoration: underline;">
                  Cancel this registration
                </a>
              </div>`
                  : ""
              }
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

You have successfully registered for ${webinarName} with ${tenant.name}.

WEBINAR SCHEDULE
Webinar: ${webinarName}
${sessionsText}
Timezone: ${timezone}

Status: Registered

We look forward to seeing you!
${cancelUrl ? `\nNeed to cancel? ${cancelUrl}` : ""}

---
${tenant.name}`;

    await emailClient.sendEmail({
      to: visitorEmail,
      from,
      subject,
      text,
      html,
      tags: [
        { Name: "EmailType", Value: "webinar-signup-confirmation" },
        { Name: "TenantId", Value: tenant.id },
      ],
    });

    console.log(
      `[DBG][webinarSignupEmail] Webinar signup confirmation sent to ${visitorEmail}`,
    );
  } catch (error) {
    // Catch errors internally — email failure must not break the API response
    console.error(
      "[DBG][webinarSignupEmail] Failed to send webinar signup confirmation:",
      error,
    );
  }
}
