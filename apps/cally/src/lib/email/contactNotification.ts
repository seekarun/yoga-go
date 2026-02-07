/**
 * Contact Notification Email
 * Sent to the tenant (business owner) when a visitor submits the contact form
 */
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import { emailClient, FALLBACK_FROM_EMAIL } from "./index";
import { getFromEmail } from "./bookingNotification";

export interface ContactNotificationData {
  visitorName: string;
  visitorEmail: string;
  message: string;
  tenant: CallyTenant;
}

/**
 * Send a contact form notification email to the tenant
 * Errors are caught internally so they don't break the API response
 */
export async function sendContactNotificationEmail(
  data: ContactNotificationData,
): Promise<void> {
  const { visitorName, visitorEmail, message, tenant } = data;

  const from = getFromEmail(tenant);
  const toEmail =
    tenant.emailConfig?.domainEmail || tenant.email || FALLBACK_FROM_EMAIL;

  try {
    console.log(
      `[DBG][contactNotification] Sending contact notification to tenant ${tenant.id} (${toEmail})`,
    );

    const subject = `New contact form message from ${visitorName}`;

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
            <td style="background: #3b82f6; padding: 25px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">
                New Contact Form Message
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                You have received a new message from your contact form.
              </p>

              <!-- Contact Details -->
              <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px;">Contact Details</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #666; width: 80px;">Name</td>
                    <td style="padding: 6px 0; color: #333; font-weight: 500;">${visitorName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #666;">Email</td>
                    <td style="padding: 6px 0; color: #333; font-weight: 500;">
                      <a href="mailto:${visitorEmail}" style="color: #3b82f6; text-decoration: none;">${visitorEmail}</a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Message -->
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 14px; font-weight: 600;">Message</h3>
                <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.6; white-space: pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
              </div>

              <!-- Reply CTA -->
              <div style="text-align: center; margin-bottom: 25px;">
                <a href="mailto:${visitorEmail}?subject=Re: Contact form inquiry" style="display: inline-block; background: #3b82f6; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
                  Reply to ${visitorName}
                </a>
              </div>

              <p style="font-size: 13px; color: #999; margin: 0; text-align: center;">
                This message was sent via your contact form on ${tenant.name}.
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

    const text = `New Contact Form Message

You have received a new message from your contact form.

CONTACT DETAILS
Name: ${visitorName}
Email: ${visitorEmail}

MESSAGE
${message}

Reply to ${visitorName}: mailto:${visitorEmail}

---
This message was sent via your contact form on ${tenant.name}.`;

    await emailClient.sendEmail({
      to: toEmail,
      from,
      subject,
      text,
      html,
      tags: [
        { Name: "EmailType", Value: "contact-notification" },
        { Name: "TenantId", Value: tenant.id },
      ],
    });

    console.log(
      `[DBG][contactNotification] Contact notification sent to ${toEmail}`,
    );
  } catch (error) {
    // Catch errors internally — email failure must not break the API response
    console.error(
      "[DBG][contactNotification] Failed to send contact notification:",
      error,
    );
  }
}
