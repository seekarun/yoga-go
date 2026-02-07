/**
 * Booking Notification Emails
 * - Pending: sent when a booking request is submitted
 * - Confirmed: sent when the tenant approves (status → scheduled)
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
 * Get the public landing page URL for a tenant
 */
export function getLandingPageUrl(tenant: CallyTenant): string {
  if (tenant.domainConfig?.domain && tenant.domainConfig.vercelVerified) {
    return `https://${tenant.domainConfig.domain}`;
  }
  // Fallback: use the cally app domain with tenant ID
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cally.live";
  return `${baseUrl}/${tenant.id}`;
}

/**
 * Get the from email for a tenant
 * Uses the tenant's verified domain email if available, else platform fallback
 */
export function getFromEmail(tenant: CallyTenant): string {
  if (
    tenant.emailConfig?.sesVerificationStatus === "verified" &&
    tenant.emailConfig.domainEmail
  ) {
    return `${tenant.name} <${tenant.emailConfig.domainEmail}>`;
  }
  return `${tenant.name} <${FALLBACK_FROM_EMAIL}>`;
}

/**
 * Get signup CTA HTML snippet for booking emails
 */
function getSignupCtaHtml(tenant: CallyTenant, visitorEmail: string): string {
  const signupUrl = `${getLandingPageUrl(tenant)}/signup?email=${encodeURIComponent(visitorEmail)}`;
  return `
              <!-- Sign Up CTA -->
              <div style="border-top: 1px solid #e5e7eb; margin-top: 25px; padding-top: 20px; text-align: center;">
                <p style="font-size: 14px; color: #666; margin: 0 0 12px 0;">
                  Sign up for a discount on your next appointment
                </p>
                <a href="${signupUrl}" style="display: inline-block; background: #4f46e5; color: #fff; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none;">
                  Sign Up Now
                </a>
              </div>`;
}

/**
 * Get signup CTA plain text for booking emails
 */
function getSignupCtaText(tenant: CallyTenant, visitorEmail: string): string {
  const signupUrl = `${getLandingPageUrl(tenant)}/signup?email=${encodeURIComponent(visitorEmail)}`;
  return `\nSign up for a discount on your next appointment: ${signupUrl}`;
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

              ${getSignupCtaHtml(tenant, visitorEmail)}
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
${getSignupCtaText(tenant, visitorEmail)}

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

// ========================================
// Booking Confirmed Email
// ========================================

export interface BookingConfirmedData {
  visitorName: string;
  visitorEmail: string;
  note?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  tenant: CallyTenant;
  message?: string;
}

/**
 * Parse visitor info from the calendar event description
 * Format: "Visitor: name\nEmail: email\nNote: note"
 */
export function parseVisitorFromDescription(
  description?: string,
): { visitorName: string; visitorEmail: string; note?: string } | null {
  if (!description) return null;

  const nameMatch = description.match(/^Visitor:\s*(.+)$/m);
  const emailMatch = description.match(/^Email:\s*(.+)$/m);
  if (!nameMatch || !emailMatch) return null;

  const noteMatch = description.match(/^Note:\s*(.+)$/m);
  return {
    visitorName: nameMatch[1].trim(),
    visitorEmail: emailMatch[1].trim(),
    note: noteMatch ? noteMatch[1].trim() : undefined,
  };
}

/**
 * Send a booking confirmed email to the visitor
 * Errors are caught internally so they don't break the API response
 */
export async function sendBookingConfirmedEmail(
  data: BookingConfirmedData,
): Promise<void> {
  const {
    visitorName,
    visitorEmail,
    note,
    startTime,
    endTime,
    tenant,
    message,
  } = data;

  const timezone = tenant.bookingConfig?.timezone || "Australia/Sydney";
  const from = getFromEmail(tenant);
  const start = formatTime(startTime, timezone);
  const end = formatTime(endTime, timezone);

  try {
    console.log(
      `[DBG][bookingNotification] Sending booking confirmed email to ${visitorEmail}`,
    );

    const subject = `Booking confirmed — ${start.dateStr}`;

    const messageHtml = message
      ? `<div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 25px;">
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #888; font-weight: 600;">Message from ${tenant.name}:</p>
                <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.5;">${message.replace(/\n/g, "<br>")}</p>
              </div>`
      : "";

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
                Booking Confirmed
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
                Great news! Your booking with <strong>${tenant.name}</strong> has been <strong>confirmed</strong>.
              </p>

              ${messageHtml}

              <!-- Booking Details -->
              <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 16px;">Booking Details</h3>
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
                <span style="display: inline-block; background: #d1fae5; color: #065f46; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                  Confirmed
                </span>
              </div>

              <p style="font-size: 13px; color: #999; margin: 0; text-align: center;">
                We look forward to seeing you!
              </p>

              ${getSignupCtaHtml(tenant, visitorEmail)}
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

Great news! Your booking with ${tenant.name} has been confirmed.
${message ? `\nMessage from ${tenant.name}:\n${message}\n` : ""}
BOOKING DETAILS
Date: ${start.dateStr}
Time: ${start.timeStr} – ${end.timeStr}
Timezone: ${timezone}${note ? `\nNote: ${note}` : ""}

Status: Confirmed

We look forward to seeing you!
${getSignupCtaText(tenant, visitorEmail)}

---
${tenant.name}`;

    await emailClient.sendEmail({
      to: visitorEmail,
      from,
      subject,
      text,
      html,
      tags: [
        { Name: "EmailType", Value: "booking-confirmed" },
        { Name: "TenantId", Value: tenant.id },
      ],
    });

    console.log(
      `[DBG][bookingNotification] Booking confirmed email sent to ${visitorEmail}`,
    );
  } catch (error) {
    console.error(
      "[DBG][bookingNotification] Failed to send booking confirmed email:",
      error,
    );
  }
}

// ========================================
// Booking Declined Email
// ========================================

export interface BookingDeclinedData {
  visitorName: string;
  visitorEmail: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  tenant: CallyTenant;
  message?: string;
}

/**
 * Send a booking declined email to the visitor
 * Errors are caught internally so they don't break the API response
 */
export async function sendBookingDeclinedEmail(
  data: BookingDeclinedData,
): Promise<void> {
  const { visitorName, visitorEmail, startTime, endTime, tenant, message } =
    data;

  const timezone = tenant.bookingConfig?.timezone || "Australia/Sydney";
  const from = getFromEmail(tenant);
  const start = formatTime(startTime, timezone);
  const end = formatTime(endTime, timezone);
  const bookingUrl = getLandingPageUrl(tenant);

  try {
    console.log(
      `[DBG][bookingNotification] Sending booking declined email to ${visitorEmail}`,
    );

    const subject = `Booking update — ${start.dateStr}`;

    const messageHtml = message
      ? `<div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 25px;">
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #888; font-weight: 600;">Message from ${tenant.name}:</p>
                <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.5;">${message.replace(/\n/g, "<br>")}</p>
              </div>`
      : "";

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
            <td style="background: #6b7280; padding: 25px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
                Booking Update
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
                We're sorry, but unfortunately <strong>${tenant.name}</strong> is unable to accommodate your booking request at this time.
              </p>

              <p style="font-size: 16px; color: #333; margin: 0 0 25px 0;">
                We sincerely apologise for any inconvenience this may cause.
              </p>

              ${messageHtml}

              <!-- Booking Details -->
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; border-left: 4px solid #9ca3af; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">Original Request</h3>
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
                </table>
              </div>

              <!-- Book Another Time CTA -->
              <div style="text-align: center; margin-bottom: 25px;">
                <a href="${bookingUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  Book Another Time
                </a>
              </div>

              <p style="font-size: 13px; color: #999; margin: 0; text-align: center;">
                Thank you for your understanding.
              </p>

              ${getSignupCtaHtml(tenant, visitorEmail)}
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

We're sorry, but unfortunately ${tenant.name} is unable to accommodate your booking request at this time.

We sincerely apologise for any inconvenience this may cause.
${message ? `\nMessage from ${tenant.name}:\n${message}\n` : ""}
ORIGINAL REQUEST
Date: ${start.dateStr}
Time: ${start.timeStr} – ${end.timeStr}
Timezone: ${timezone}

Book another time: ${bookingUrl}

Thank you for your understanding.
${getSignupCtaText(tenant, visitorEmail)}

---
${tenant.name}`;

    await emailClient.sendEmail({
      to: visitorEmail,
      from,
      subject,
      text,
      html,
      tags: [
        { Name: "EmailType", Value: "booking-declined" },
        { Name: "TenantId", Value: tenant.id },
      ],
    });

    console.log(
      `[DBG][bookingNotification] Booking declined email sent to ${visitorEmail}`,
    );
  } catch (error) {
    console.error(
      "[DBG][bookingNotification] Failed to send booking declined email:",
      error,
    );
  }
}
