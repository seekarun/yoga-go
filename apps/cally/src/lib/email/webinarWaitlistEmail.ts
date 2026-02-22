/**
 * Webinar Waitlist Emails
 * - Confirmation: sent when visitor joins the webinar waitlist
 * - Slot Available: sent when a cancellation opens a spot
 */
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import { emailClient } from "./index";
import { getFromEmail, getLandingPageUrl } from "./bookingNotification";

export interface WebinarWaitlistConfirmationData {
  visitorName: string;
  visitorEmail: string;
  webinarName: string;
  position: number;
  tenant: CallyTenant;
}

export interface WebinarWaitlistSlotAvailableData {
  visitorName: string;
  visitorEmail: string;
  webinarName: string;
  tenant: CallyTenant;
  signupUrl: string;
}

/**
 * Send webinar waitlist confirmation email to visitor.
 * Fire-and-forget — errors are caught internally.
 */
export async function sendWebinarWaitlistConfirmationEmail(
  data: WebinarWaitlistConfirmationData,
): Promise<void> {
  const { visitorName, visitorEmail, webinarName, position, tenant } = data;
  const from = getFromEmail(tenant);

  try {
    console.log(
      `[DBG][webinarWaitlistEmail] Sending waitlist confirmation to ${visitorEmail}`,
    );

    const subject = `You're on the waitlist — ${webinarName}`;

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
                You're on the Waitlist
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
                You've been added to the waitlist for <strong>${webinarName}</strong> by <strong>${tenant.name}</strong>.
              </p>

              <p style="font-size: 16px; color: #333; margin: 0 0 25px 0;">
                If a spot opens up, we'll email you right away so you can sign up.
              </p>

              <!-- Position Badge -->
              <div style="background: #eef2ff; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1; margin-bottom: 25px; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Your position</p>
                <p style="margin: 0; font-size: 36px; font-weight: 700; color: #4f46e5;">#${position}</p>
              </div>

              <p style="font-size: 13px; color: #999; margin: 0; text-align: center;">
                You'll be notified automatically when a spot becomes available.
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

You've been added to the waitlist for ${webinarName} by ${tenant.name}.

Your position: #${position}

If a spot opens up, we'll email you right away so you can sign up.

---
${tenant.name}`;

    await emailClient.sendEmail({
      to: visitorEmail,
      from,
      subject,
      text,
      html,
      tags: [
        { Name: "EmailType", Value: "webinar-waitlist-confirmation" },
        { Name: "TenantId", Value: tenant.id },
      ],
    });

    console.log(
      `[DBG][webinarWaitlistEmail] Waitlist confirmation sent to ${visitorEmail}`,
    );
  } catch (error) {
    console.error(
      "[DBG][webinarWaitlistEmail] Failed to send waitlist confirmation:",
      error,
    );
  }
}

/**
 * Send slot-available email to the next waitlisted visitor for a webinar.
 * Fire-and-forget — errors are caught internally.
 */
export async function sendWebinarWaitlistSlotAvailableEmail(
  data: WebinarWaitlistSlotAvailableData,
): Promise<void> {
  const { visitorName, visitorEmail, webinarName, tenant, signupUrl } = data;
  const from = getFromEmail(tenant);
  const landingPageUrl = getLandingPageUrl(tenant);

  try {
    console.log(
      `[DBG][webinarWaitlistEmail] Sending slot-available email to ${visitorEmail}`,
    );

    const subject = `A spot opened up — ${webinarName}`;

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
                A Spot Just Opened Up!
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
                Great news! A spot has opened up for <strong>${webinarName}</strong> by <strong>${tenant.name}</strong>.
              </p>

              <p style="font-size: 16px; color: #333; margin: 0 0 25px 0;">
                Sign up now before someone else takes it. You have <strong>10 minutes</strong> before the next person on the waitlist is notified.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 25px;">
                <a href="${signupUrl}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  Sign Up Now
                </a>
              </div>

              <p style="font-size: 13px; color: #999; margin: 0; text-align: center;">
                Or visit <a href="${landingPageUrl}" style="color: #6366f1;">${tenant.name}'s page</a> to see all available webinars.
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

Great news! A spot has opened up for ${webinarName} by ${tenant.name}.

Sign up now before someone else takes it. You have 10 minutes before the next person on the waitlist is notified.

Sign up now: ${signupUrl}

Or visit ${tenant.name}'s page: ${landingPageUrl}

---
${tenant.name}`;

    await emailClient.sendEmail({
      to: visitorEmail,
      from,
      subject,
      text,
      html,
      tags: [
        { Name: "EmailType", Value: "webinar-waitlist-slot-available" },
        { Name: "TenantId", Value: tenant.id },
      ],
    });

    console.log(
      `[DBG][webinarWaitlistEmail] Slot-available email sent to ${visitorEmail}`,
    );
  } catch (error) {
    console.error(
      "[DBG][webinarWaitlistEmail] Failed to send slot-available email:",
      error,
    );
  }
}
