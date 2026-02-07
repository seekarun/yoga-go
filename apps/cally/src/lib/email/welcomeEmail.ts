/**
 * Welcome Email
 * Sent when a visitor signs up as a subscriber for a tenant
 */
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import { emailClient } from "./index";
import { getLandingPageUrl, getFromEmail } from "./bookingNotification";

export interface WelcomeEmailData {
  name: string;
  email: string;
  tenant: CallyTenant;
}

/**
 * Send a welcome email to a new subscriber
 * Fire-and-forget — errors are caught internally
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  const { name, email, tenant } = data;
  const from = getFromEmail(tenant);
  const landingPageUrl = getLandingPageUrl(tenant);

  try {
    console.log(
      `[DBG][welcomeEmail] Sending welcome email to ${email} for tenant ${tenant.id}`,
    );

    const subject = `Welcome to ${tenant.name}!`;

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
                Welcome to ${tenant.name}!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                Hi ${name},
              </p>

              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                Thank you for signing up! As a subscriber, you'll receive exclusive discounts and updates from <strong>${tenant.name}</strong>.
              </p>

              <p style="font-size: 16px; color: #333; margin: 0 0 25px 0;">
                We're excited to have you on board and look forward to serving you.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 25px;">
                <a href="${landingPageUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  Visit ${tenant.name}
                </a>
              </div>

              <p style="font-size: 13px; color: #999; margin: 0; text-align: center;">
                Thank you for being a valued subscriber.
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

    const text = `Hi ${name},

Welcome to ${tenant.name}!

Thank you for signing up! As a subscriber, you'll receive exclusive discounts and updates from ${tenant.name}.

We're excited to have you on board and look forward to serving you.

Visit ${tenant.name}: ${landingPageUrl}

Thank you for being a valued subscriber.

---
${tenant.name}`;

    await emailClient.sendEmail({
      to: email,
      from,
      subject,
      text,
      html,
      tags: [
        { Name: "EmailType", Value: "welcome" },
        { Name: "TenantId", Value: tenant.id },
      ],
    });

    console.log(`[DBG][welcomeEmail] Welcome email sent to ${email}`);
  } catch (error) {
    console.error("[DBG][welcomeEmail] Failed to send welcome email:", error);
  }
}
