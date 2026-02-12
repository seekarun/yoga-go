/**
 * Booking Cancelled Email
 * Sends cancellation notifications to both the visitor and the tenant.
 */
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import { emailClient, FALLBACK_FROM_EMAIL } from "./index";
import {
  formatTime,
  getFromEmail,
  getLandingPageUrl,
} from "./bookingNotification";

export interface BookingCancelledEmailData {
  visitorName: string;
  visitorEmail: string;
  startTime: string;
  endTime: string;
  tenant: CallyTenant;
  cancelledBy: "tenant" | "visitor";
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
 * Send cancellation email to the visitor
 */
export async function sendBookingCancelledEmailToVisitor(
  data: BookingCancelledEmailData,
): Promise<void> {
  const {
    visitorName,
    visitorEmail,
    startTime,
    endTime,
    tenant,
    cancelledBy,
    refundAmountCents,
    currency,
    isFullRefund,
    message,
  } = data;

  const timezone = tenant.bookingConfig?.timezone || "Australia/Sydney";
  const from = getFromEmail(tenant);
  const start = formatTime(startTime, timezone);
  const end = formatTime(endTime, timezone);
  const bookingUrl = getLandingPageUrl(tenant);

  const cancelledByLabel =
    cancelledBy === "tenant" ? `by ${tenant.name}` : "by you";
  const hasRefund = refundAmountCents > 0;

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
      `[DBG][bookingCancelledEmail] Sending cancellation email to visitor ${visitorEmail}`,
    );

    const subject = `Booking cancelled — ${start.dateStr}`;

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
                Booking Cancelled
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
                Your booking with <strong>${tenant.name}</strong> has been <strong>cancelled</strong> ${cancelledByLabel}.
              </p>

              ${messageHtml}

              <!-- Booking Details -->
              <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #991b1b; font-size: 16px;">Cancelled Booking</h3>
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

              ${refundHtml}

              <!-- Book Another Time CTA -->
              <div style="text-align: center; margin-bottom: 25px;">
                <a href="${bookingUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  Book Another Time
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

Your booking with ${tenant.name} has been cancelled ${cancelledByLabel}.
${message ? `\nMessage from ${tenant.name}:\n${message}\n` : ""}
CANCELLED BOOKING
Date: ${start.dateStr}
Time: ${start.timeStr} – ${end.timeStr}
Timezone: ${timezone}
${refundText}

Book another time: ${bookingUrl}

---
${tenant.name}`;

    await emailClient.sendEmail({
      to: visitorEmail,
      from,
      subject,
      text,
      html,
      tags: [
        { Name: "EmailType", Value: "booking-cancelled" },
        { Name: "TenantId", Value: tenant.id },
      ],
    });

    console.log(
      `[DBG][bookingCancelledEmail] Cancellation email sent to visitor ${visitorEmail}`,
    );
  } catch (error) {
    console.error(
      "[DBG][bookingCancelledEmail] Failed to send cancellation email to visitor:",
      error,
    );
  }
}

/**
 * Send cancellation notification email to the tenant
 */
export async function sendBookingCancelledEmailToTenant(
  data: BookingCancelledEmailData,
): Promise<void> {
  const {
    visitorName,
    visitorEmail,
    startTime,
    endTime,
    tenant,
    refundAmountCents,
    currency,
    isFullRefund,
  } = data;

  const timezone = tenant.bookingConfig?.timezone || "Australia/Sydney";
  const start = formatTime(startTime, timezone);
  const end = formatTime(endTime, timezone);

  const hasRefund = refundAmountCents > 0;

  try {
    console.log(
      `[DBG][bookingCancelledEmail] Sending cancellation notification to tenant ${tenant.email}`,
    );

    const subject = `Booking cancelled by visitor — ${start.dateStr}`;

    const text = `A visitor has cancelled their booking.

VISITOR: ${visitorName} (${visitorEmail})
Date: ${start.dateStr}
Time: ${start.timeStr} – ${end.timeStr}
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
                Visitor Cancelled Booking
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                <strong>${visitorName}</strong> (${visitorEmail}) has cancelled their booking.
              </p>

              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; border-left: 4px solid #9ca3af; margin-bottom: 25px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #666; width: 100px;">Date</td>
                    <td style="padding: 6px 0; color: #333; font-weight: 500;">${start.dateStr}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #666;">Time</td>
                    <td style="padding: 6px 0; color: #333; font-weight: 500;">${start.timeStr} – ${end.timeStr}</td>
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
        { Name: "EmailType", Value: "booking-cancelled-tenant-notification" },
        { Name: "TenantId", Value: tenant.id },
      ],
    });

    console.log(
      `[DBG][bookingCancelledEmail] Tenant notification sent to ${tenant.email}`,
    );
  } catch (error) {
    console.error(
      "[DBG][bookingCancelledEmail] Failed to send tenant notification:",
      error,
    );
  }
}
