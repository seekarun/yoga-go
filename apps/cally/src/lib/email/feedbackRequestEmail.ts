/**
 * Feedback Request Email
 * Sent when a tenant requests feedback from a user
 */
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import { emailClient } from "./index";
import { getFromEmail, getLandingPageUrl } from "./bookingNotification";

export interface FeedbackRequestEmailData {
  recipientName: string;
  recipientEmail: string;
  customMessage?: string;
  token: string;
  tenant: CallyTenant;
}

/**
 * Send a feedback request email to a user
 * Fire-and-forget — errors are caught internally
 */
export async function sendFeedbackRequestEmail(
  data: FeedbackRequestEmailData,
): Promise<void> {
  const { recipientName, recipientEmail, customMessage, token, tenant } = data;

  const from = getFromEmail(tenant);
  const landingPageUrl = getLandingPageUrl(tenant);
  const feedbackUrl = `${landingPageUrl}/feedback?token=${token}`;

  const defaultMessage =
    "I'd love to hear your feedback! Please take a moment to share your experience.";
  const message = customMessage || defaultMessage;

  try {
    console.log(
      `[DBG][feedbackRequestEmail] Sending feedback request to ${recipientEmail}`,
    );

    const subject = `${tenant.name} would love your feedback`;

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
            <td style="background: #8b5cf6; padding: 25px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
                We'd Love Your Feedback
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                Hi ${recipientName},
              </p>

              <p style="font-size: 16px; color: #333; margin: 0 0 25px 0; line-height: 1.6;">
                ${message}
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${feedbackUrl}" style="display: inline-block; background: #8b5cf6; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  Share Your Feedback
                </a>
              </div>

              <p style="font-size: 13px; color: #999; margin: 0; text-align: center;">
                This link is unique to you. You only need to submit once.
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

    const text = `Hi ${recipientName},

${message}

Share your feedback here: ${feedbackUrl}

This link is unique to you. You only need to submit once.

---
${tenant.name}`;

    await emailClient.sendEmail({
      to: recipientEmail,
      from,
      subject,
      text,
      html,
      tags: [
        { Name: "EmailType", Value: "feedback-request" },
        { Name: "TenantId", Value: tenant.id },
      ],
    });

    console.log(
      `[DBG][feedbackRequestEmail] Feedback request email sent to ${recipientEmail}`,
    );
  } catch (error) {
    console.error(
      "[DBG][feedbackRequestEmail] Failed to send feedback request email:",
      error,
    );
  }
}
