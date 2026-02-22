/**
 * Webinar Cancelled Email
 * Sends cancellation notifications to both the visitor and the tenant.
 */
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import { emailClient, FALLBACK_FROM_EMAIL } from "./index";
import { getFromEmail, getLandingPageUrl } from "./bookingNotification";

export interface WebinarCancelledSession {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface WebinarCancelledEmailData {
  visitorName: string;
  visitorEmail: string;
  webinarName: string;
  sessions: WebinarCancelledSession[];
  tenant: CallyTenant;
  cancelledBy: "visitor" | "tenant";
  refundAmountCents: number;
  currency: string;
  isFullRefund: boolean;
  message?: string;
}

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
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
 * Build the sessions HTML for the cancelled email — one row per session
 */
function buildSessionsHtml(
  sessions: WebinarCancelledSession[],
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
 * Build the sessions plain text for the cancelled email
 */
function buildSessionsText(
  sessions: WebinarCancelledSession[],
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
 * Send cancellation email to the visitor
 * Red header (#dc2626), shows webinar name + sessions, refund info, "Browse Services" CTA
 * Fire-and-forget: errors are caught internally so they don't break the API response
 */
export async function sendWebinarCancelledEmailToVisitor(
  data: WebinarCancelledEmailData,
): Promise<void> {
  const {
    visitorName,
    visitorEmail,
    webinarName,
    sessions,
    tenant,
    cancelledBy,
    refundAmountCents,
    currency,
    isFullRefund,
    message,
  } = data;

  const timezone = tenant.bookingConfig?.timezone || "Australia/Sydney";
  const from = getFromEmail(tenant);
  const landingPageUrl = getLandingPageUrl(tenant);

  const cancelledByLabel =
    cancelledBy === "tenant" ? `by ${tenant.name}` : "by you";
  const hasRefund = refundAmountCents > 0;

  const sessionsHtml = buildSessionsHtml(sessions, timezone);
  const sessionsText = buildSessionsText(sessions, timezone);

  const refundHtml = hasRefund
    ? `<div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #10b981;">
                <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 600; color: #065f46;">Refund</p>
                <p style="margin: 0; font-size: 16px; color: #333;">
                  ${isFullRefund ? "Full" : "Partial"} refund of <strong>${formatCurrency(refundAmountCents, currency)}</strong> will be processed to your original payment method. This may take 5-10 business days.
                </p>
              </div>`
    : `<div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  No refund is applicable for this cancellation per the cancellation policy.
                </p>
              </div>`;

  const messageHtml = message
    ? `<div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 25px;">
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #888; font-weight: 600;">Message from ${tenant.name}:</p>
                <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.5;">${message.replace(/\n/g, "<br>")}</p>
              </div>`
    : "";

  try {
    console.log(
      `[DBG][webinarCancelledEmail] Sending cancellation email to visitor ${visitorEmail}`,
    );

    const subject = `Webinar registration cancelled — ${webinarName}`;

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
            <td style="background: #dc2626; padding: 25px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
                Webinar Registration Cancelled
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
                Your registration for <strong>${webinarName}</strong> with <strong>${tenant.name}</strong> has been <strong>cancelled</strong> ${cancelledByLabel}.
              </p>

              ${messageHtml}

              <!-- Webinar Details -->
              <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #991b1b; font-size: 16px;">Cancelled Webinar</h3>
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

              ${refundHtml}

              <!-- Browse Services CTA -->
              <div style="text-align: center; margin-bottom: 25px;">
                <a href="${landingPageUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  Browse Services
                </a>
              </div>
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

    const refundText = hasRefund
      ? `\nRefund: ${isFullRefund ? "Full" : "Partial"} refund of ${formatCurrency(refundAmountCents, currency)} will be processed to your original payment method (5-10 business days).`
      : "\nNo refund is applicable for this cancellation per the cancellation policy.";

    const text = `Hi ${visitorName},

Your registration for ${webinarName} with ${tenant.name} has been cancelled ${cancelledByLabel}.
${message ? `\nMessage from ${tenant.name}:\n${message}\n` : ""}
CANCELLED WEBINAR
Webinar: ${webinarName}
${sessionsText}
Timezone: ${timezone}
${refundText}

Browse services: ${landingPageUrl}

---
${tenant.name}`;

    await emailClient.sendEmail({
      to: visitorEmail,
      from,
      subject,
      text,
      html,
      tags: [
        { Name: "EmailType", Value: "webinar-cancelled" },
        { Name: "TenantId", Value: tenant.id },
      ],
    });

    console.log(
      `[DBG][webinarCancelledEmail] Cancellation email sent to visitor ${visitorEmail}`,
    );
  } catch (error) {
    console.error(
      "[DBG][webinarCancelledEmail] Failed to send cancellation email to visitor:",
      error,
    );
  }
}

/**
 * Send cancellation notification email to the tenant
 * Orange header (#f97316), notifies tenant of visitor cancellation + refund status
 * Fire-and-forget: errors are caught internally so they don't break the API response
 */
export async function sendWebinarCancelledEmailToTenant(
  data: WebinarCancelledEmailData,
): Promise<void> {
  const {
    visitorName,
    visitorEmail,
    webinarName,
    sessions,
    tenant,
    refundAmountCents,
    currency,
    isFullRefund,
  } = data;

  const timezone = tenant.bookingConfig?.timezone || "Australia/Sydney";
  const hasRefund = refundAmountCents > 0;

  const sessionsHtml = buildSessionsHtml(sessions, timezone);
  const sessionsText = buildSessionsText(sessions, timezone);

  try {
    console.log(
      `[DBG][webinarCancelledEmail] Sending cancellation notification to tenant ${tenant.email}`,
    );

    const subject = `Webinar registration cancelled by visitor — ${webinarName}`;

    const text = `A visitor has cancelled their webinar registration.

VISITOR: ${visitorName} (${visitorEmail})
Webinar: ${webinarName}
${sessionsText}
Timezone: ${timezone}
${hasRefund ? `Refund: ${isFullRefund ? "Full" : "Partial"} refund of ${formatCurrency(refundAmountCents, currency)} has been issued.` : "No refund issued."}`;

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
            <td style="background: #f97316; padding: 25px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
                Visitor Cancelled Webinar Registration
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                <strong>${visitorName}</strong> (${visitorEmail}) has cancelled their registration for <strong>${webinarName}</strong>.
              </p>

              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; border-left: 4px solid #9ca3af; margin-bottom: 25px;">
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

              ${
                hasRefund
                  ? `<p style="font-size: 14px; color: #065f46; background: #ecfdf5; padding: 12px 16px; border-radius: 8px;">
                      ${isFullRefund ? "Full" : "Partial"} refund of <strong>${formatCurrency(refundAmountCents, currency)}</strong> has been issued automatically.
                    </p>`
                  : `<p style="font-size: 14px; color: #666;">No refund was issued.</p>`
              }
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #888;">${tenant.name}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send to tenant's primary email address
    await emailClient.sendEmail({
      to: tenant.email,
      from: `CallyGo <${FALLBACK_FROM_EMAIL}>`,
      subject,
      text,
      html,
      tags: [
        {
          Name: "EmailType",
          Value: "webinar-cancelled-tenant-notification",
        },
        { Name: "TenantId", Value: tenant.id },
      ],
    });

    console.log(
      `[DBG][webinarCancelledEmail] Tenant notification sent to ${tenant.email}`,
    );
  } catch (error) {
    console.error(
      "[DBG][webinarCancelledEmail] Failed to send tenant notification:",
      error,
    );
  }
}
