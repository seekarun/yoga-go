import { SESClient, SendEmailCommand, SendTemplatedEmailCommand } from '@aws-sdk/client-ses';
import { getTenantByExpertId } from '@/lib/repositories/tenantRepository';

// ========================================
// AWS SES Email Service
// ========================================
// Uses IAM role credentials automatically in ECS

// SES is in us-west-2 for email receiving support (receiving only available in us-east-1, us-west-2, eu-west-1)
const sesClient = new SESClient({
  region: process.env.SES_REGION || 'us-west-2',
});

const fromEmail = process.env.SES_FROM_EMAIL || 'hi@myyoga.guru';
const configSet = process.env.SES_CONFIG_SET;

console.log('[DBG][email] SES Email service initialized');
console.log(`[DBG][email] From: ${fromEmail}, ConfigSet: ${configSet || 'none'}`);

// ========================================
// SendGrid Fallback (commented out)
// ========================================
// Uncomment to use SendGrid instead of SES:
//
// import sgMail from '@sendgrid/mail';
//
// const apiKey = process.env.SENDGRID_API_KEY;
//
// if (!apiKey) {
//   console.warn('[DBG][email] SENDGRID_API_KEY is not set. Email functionality will not work.');
// } else {
//   sgMail.setApiKey(apiKey);
//   console.log('[DBG][email] SendGrid initialized successfully');
// }

export interface EmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email using AWS SES
 * @param options - Email options including to, from, subject, text, and optional html
 * @returns Promise that resolves when email is sent
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const { to, from = fromEmail, subject, text, html } = options;

  const recipients = Array.isArray(to) ? to : [to];

  console.log(`[DBG][email] Sending email via SES to ${recipients.join(', ')}`);
  console.log(`[DBG][email] Subject: ${subject}`);

  const command = new SendEmailCommand({
    Source: from,
    Destination: {
      ToAddresses: recipients,
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: text,
          Charset: 'UTF-8',
        },
        Html: {
          Data: html || text.replace(/\n/g, '<br>'),
          Charset: 'UTF-8',
        },
      },
    },
    ConfigurationSetName: configSet,
    Tags: [
      {
        Name: 'EmailType',
        Value: 'transactional',
      },
    ],
  });

  try {
    const response = await sesClient.send(command);
    console.log(`[DBG][email] Email sent successfully. MessageId: ${response.MessageId}`);
  } catch (error) {
    console.error('[DBG][email] Error sending email:', error);
    // Log AWS-specific error details
    if (error && typeof error === 'object') {
      const awsError = error as {
        name?: string;
        message?: string;
        Code?: string;
        $metadata?: unknown;
      };
      console.error('[DBG][email] AWS Error name:', awsError.name);
      console.error('[DBG][email] AWS Error message:', awsError.message);
      console.error('[DBG][email] AWS Error code:', awsError.Code);
      console.error('[DBG][email] AWS metadata:', JSON.stringify(awsError.$metadata));
    }
    throw error;
  }
};

/**
 * Send emails to multiple recipients (sends individually for tracking)
 * @param options - Email options with array of recipients
 * @returns Promise that resolves when all emails are sent
 */
export const sendBulkEmail = async (options: EmailOptions): Promise<void> => {
  const { to, from = fromEmail, subject, text, html } = options;

  const recipients = Array.isArray(to) ? to : [to];

  console.log(`[DBG][email] Sending bulk email via SES to ${recipients.length} recipients`);
  console.log(`[DBG][email] Subject: ${subject}`);

  // Send emails individually for proper tracking per recipient
  // This ensures each recipient gets their own MessageId for tracking
  const results = await Promise.allSettled(
    recipients.map(recipient =>
      sendEmail({
        to: recipient,
        from,
        subject,
        text,
        html,
      })
    )
  );

  // Check for failures
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.error(`[DBG][email] ${failures.length}/${recipients.length} emails failed to send`);
    // Re-throw if all failed
    if (failures.length === recipients.length) {
      throw new Error('All bulk emails failed to send');
    }
  }

  console.log(
    `[DBG][email] Bulk email completed: ${recipients.length - failures.length}/${recipients.length} sent successfully`
  );
};

// ========================================
// Invoice Email (using SES template)
// ========================================

export interface InvoiceEmailOptions {
  to: string;
  from?: string; // Optional custom from address (e.g., expert@myyoga.guru)
  customerName: string;
  orderId: string;
  orderDate: string;
  paymentMethod: string;
  itemName: string;
  itemDescription: string;
  currency: string;
  amount: string;
  transactionId: string;
}

/**
 * Send an invoice/payment confirmation email using SES template
 * @param options - Invoice details for the email
 * @returns Promise that resolves when email is sent
 */
export const sendInvoiceEmail = async (options: InvoiceEmailOptions): Promise<void> => {
  const {
    to,
    from,
    customerName,
    orderId,
    orderDate,
    paymentMethod,
    itemName,
    itemDescription,
    currency,
    amount,
    transactionId,
  } = options;

  // Use custom from address if provided, otherwise default
  const sourceEmail = from || fromEmail;

  console.log(`[DBG][email] Sending invoice email to ${to} from ${sourceEmail}`);
  console.log(`[DBG][email] Order ID: ${orderId}, Amount: ${currency} ${amount}`);

  const templateData = {
    customerName,
    orderId,
    orderDate,
    paymentMethod,
    itemName,
    itemDescription,
    currency,
    amount,
    transactionId,
  };

  const command = new SendTemplatedEmailCommand({
    Source: sourceEmail,
    Destination: {
      ToAddresses: [to],
    },
    Template: 'yoga-go-invoice',
    TemplateData: JSON.stringify(templateData),
    ConfigurationSetName: configSet,
    Tags: [
      {
        Name: 'EmailType',
        Value: 'invoice',
      },
    ],
  });

  try {
    const response = await sesClient.send(command);
    console.log(`[DBG][email] Invoice email sent successfully. MessageId: ${response.MessageId}`);
  } catch (error) {
    console.error('[DBG][email] Error sending invoice email:', error);
    throw error;
  }
};

// ========================================
// Webinar Registration Email
// ========================================

export interface WebinarRegistrationEmailOptions {
  to: string;
  from?: string;
  customerName: string;
  webinarTitle: string;
  webinarDescription: string;
  sessions: Array<{
    title: string;
    startTime: string;
    duration: number;
  }>;
  currency: string;
  amount: string;
  transactionId: string;
}

/**
 * Format date and time for display in email
 */
function formatSessionDateTime(isoString: string): { date: string; time: string } {
  const date = new Date(isoString);
  return {
    date: date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    time: date.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }),
  };
}

/**
 * Send a webinar registration confirmation email
 * @param options - Webinar registration details for the email
 * @returns Promise that resolves when email is sent
 */
export const sendWebinarRegistrationEmail = async (
  options: WebinarRegistrationEmailOptions
): Promise<void> => {
  const {
    to,
    from,
    customerName,
    webinarTitle,
    webinarDescription,
    sessions,
    currency,
    amount,
    transactionId,
  } = options;

  const sourceEmail = from || fromEmail;

  console.log(`[DBG][email] Sending webinar registration email to ${to} from ${sourceEmail}`);
  console.log(`[DBG][email] Webinar: ${webinarTitle}, Sessions: ${sessions.length}`);

  // Build session list HTML
  const sessionListHtml = sessions
    .map(session => {
      const { date, time } = formatSessionDateTime(session.startTime);
      return `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
          <strong>${session.title}</strong><br/>
          <span style="color: #666;">${date} at ${time}</span><br/>
          <span style="color: #888; font-size: 13px;">Duration: ${session.duration} minutes</span>
        </td>
      </tr>
    `;
    })
    .join('');

  const sessionListText = sessions
    .map(session => {
      const { date, time } = formatSessionDateTime(session.startTime);
      return `- ${session.title}\n  ${date} at ${time}\n  Duration: ${session.duration} minutes`;
    })
    .join('\n\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">You're Registered!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                Hi ${customerName},
              </p>

              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                Thank you for registering for <strong>${webinarTitle}</strong>! We're excited to have you join us.
              </p>

              ${webinarDescription ? `<p style="font-size: 14px; color: #666; margin: 0 0 25px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">${webinarDescription}</p>` : ''}

              <!-- Sessions -->
              <h2 style="font-size: 18px; color: #333; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #667eea;">
                Your Sessions
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                ${sessionListHtml}
              </table>

              <div style="background: #f0f7ff; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
                <p style="margin: 0; font-size: 14px; color: #0066cc;">
                  <strong>Important:</strong> You'll receive meeting links closer to each session. Make sure to add these dates to your calendar!
                </p>
              </div>

              <!-- Payment Details -->
              <h2 style="font-size: 18px; color: #333; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #667eea;">
                Payment Confirmation
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">Amount Paid</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">${currency} ${amount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Transaction ID</td>
                  <td style="padding: 8px 0; text-align: right; font-family: monospace; color: #333;">${transactionId}</td>
                </tr>
              </table>

              <p style="font-size: 14px; color: #666; margin: 0;">
                If you have any questions, simply reply to this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #888;">
                &copy; ${new Date().getFullYear()} MyYoga.guru. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
Hi ${customerName},

Thank you for registering for ${webinarTitle}! We're excited to have you join us.

${webinarDescription ? `About this webinar:\n${webinarDescription}\n` : ''}
YOUR SESSIONS
${sessionListText}

IMPORTANT: You'll receive meeting links closer to each session. Make sure to add these dates to your calendar!

PAYMENT CONFIRMATION
Amount Paid: ${currency} ${amount}
Transaction ID: ${transactionId}

If you have any questions, simply reply to this email.

© ${new Date().getFullYear()} MyYoga.guru. All rights reserved.
`;

  const command = new SendEmailCommand({
    Source: sourceEmail,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: `You're registered for ${webinarTitle}!`,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: text,
          Charset: 'UTF-8',
        },
        Html: {
          Data: html,
          Charset: 'UTF-8',
        },
      },
    },
    ConfigurationSetName: configSet,
    Tags: [
      {
        Name: 'EmailType',
        Value: 'webinar-registration',
      },
    ],
  });

  try {
    const response = await sesClient.send(command);
    console.log(
      `[DBG][email] Webinar registration email sent successfully. MessageId: ${response.MessageId}`
    );
  } catch (error) {
    console.error('[DBG][email] Error sending webinar registration email:', error);
    throw error;
  }
};

// ========================================
// Expert Email Helper
// ========================================

/**
 * Get the default email address for an expert
 */
export function getExpertFromEmail(expertId: string): string {
  return `${expertId}@myyoga.guru`;
}

/**
 * Get the appropriate "from" email address for an expert
 * Checks if expert has a verified BYOD domain email, otherwise falls back to platform email
 *
 * Priority:
 * 1. BYOD domain email (if verified) - e.g., contact@kavithayoga.com
 * 2. Platform email - e.g., kavitha@myyoga.guru
 *
 * @param expertId - The expert's ID
 * @returns Promise resolving to the email address to use for sending
 */
export async function getFromEmailForExpert(expertId: string): Promise<string> {
  console.log(`[DBG][email] Getting from email for expert: ${expertId}`);

  try {
    // Look up tenant for the expert to check for BYOD email
    const tenant = await getTenantByExpertId(expertId);

    // If tenant has verified BYOD email, use it
    if (
      tenant?.emailConfig?.sesVerificationStatus === 'verified' &&
      tenant.emailConfig.domainEmail
    ) {
      console.log(
        `[DBG][email] Using BYOD email for ${expertId}: ${tenant.emailConfig.domainEmail}`
      );
      return tenant.emailConfig.domainEmail;
    }

    // Fall back to platform email
    const platformEmail = getExpertFromEmail(expertId);
    console.log(`[DBG][email] Using platform email for ${expertId}: ${platformEmail}`);
    return platformEmail;
  } catch (error) {
    console.error(`[DBG][email] Error getting from email for ${expertId}:`, error);
    // On error, fall back to platform email
    return getExpertFromEmail(expertId);
  }
}

/**
 * Determine which "from" email to use based on context
 * - On expert subdomain: use expert's email (expertId@myyoga.guru)
 * - On main domain: use platform email (hi@myyoga.guru)
 *
 * @param expertId - The expert's ID (from course instructor)
 * @param referer - The referer header from the request
 * @returns The appropriate from email address
 */
export function getContextualFromEmail(expertId: string | null, referer: string | null): string {
  if (!expertId || !referer) {
    return fromEmail;
  }

  // Check if referer is from an expert subdomain (e.g., arun.myyoga.guru)
  const isExpertSubdomain =
    referer.includes('.myyoga.guru') &&
    !referer.includes('www.myyoga.guru') &&
    !referer.startsWith('https://myyoga.guru') &&
    !referer.startsWith('http://myyoga.guru');

  if (isExpertSubdomain) {
    return getExpertFromEmail(expertId);
  }

  return fromEmail;
}

export interface ExpertEmailOptions {
  expertId: string;
  customEmail?: string;
  emailVerified?: boolean;
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email on behalf of an expert
 * Uses the expert's verified custom email if available, otherwise uses default
 *
 * @param options - Email options including expertId and recipient details
 * @returns Promise that resolves when email is sent
 */
export const sendExpertEmail = async (options: ExpertEmailOptions): Promise<void> => {
  const { expertId, customEmail, emailVerified, to, subject, text, html } = options;

  // Determine which email address to send from
  const from = customEmail && emailVerified ? customEmail : getExpertFromEmail(expertId);

  console.log(`[DBG][email] Sending expert email from ${from}`);

  await sendEmail({
    to,
    from,
    subject,
    text,
    html,
  });
};

// ========================================
// SendGrid Fallback Implementation (commented out)
// ========================================
// export const sendEmail = async (options: EmailOptions): Promise<void> => {
//   if (!apiKey) {
//     throw new Error('SENDGRID_API_KEY is not configured. Cannot send emails.');
//   }
//
//   const {
//     to,
//     from = process.env.SENDGRID_FROM_EMAIL || 'hi@myyoga.guru',
//     subject,
//     text,
//     html,
//   } = options;
//
//   console.log(`[DBG][email] Sending email to ${Array.isArray(to) ? to.join(', ') : to}`);
//   console.log(`[DBG][email] Subject: ${subject}`);
//
//   try {
//     const msg = {
//       to,
//       from,
//       subject,
//       text,
//       html: html || text.replace(/\n/g, '<br>'),
//     };
//
//     await sgMail.send(msg);
//     console.log('[DBG][email] Email sent successfully');
//   } catch (error) {
//     console.error('[DBG][email] Error sending email:', error);
//     throw error;
//   }
// };
//
// export const sendBulkEmail = async (options: EmailOptions): Promise<void> => {
//   if (!apiKey) {
//     throw new Error('SENDGRID_API_KEY is not configured. Cannot send emails.');
//   }
//
//   const {
//     to,
//     from = process.env.SENDGRID_FROM_EMAIL || 'hi@myyoga.guru',
//     subject,
//     text,
//     html,
//   } = options;
//
//   const recipients = Array.isArray(to) ? to : [to];
//
//   console.log(`[DBG][email] Sending bulk email to ${recipients.length} recipients`);
//   console.log(`[DBG][email] Subject: ${subject}`);
//
//   try {
//     const msg = {
//       to: recipients,
//       from,
//       subject,
//       text,
//       html: html || text.replace(/\n/g, '<br>'),
//     };
//
//     await sgMail.sendMultiple(msg);
//     console.log(`[DBG][email] Bulk email sent successfully to ${recipients.length} recipients`);
//   } catch (error) {
//     console.error('[DBG][email] Error sending bulk email:', error);
//     throw error;
//   }
// };

// ========================================
// Webinar Reminder Email
// ========================================

export interface WebinarReminderEmailOptions {
  to: string;
  from?: string;
  customerName: string;
  webinarTitle: string;
  sessionTitle: string;
  startTime: string;
  duration: number;
  meetLink?: string;
  reminderType: 'dayBefore' | 'hourBefore';
}

/**
 * Send a webinar reminder email
 * @param options - Webinar reminder details
 * @returns Promise that resolves when email is sent
 */
export const sendWebinarReminderEmail = async (
  options: WebinarReminderEmailOptions
): Promise<void> => {
  const {
    to,
    from,
    customerName,
    webinarTitle,
    sessionTitle,
    startTime,
    duration,
    meetLink,
    reminderType,
  } = options;

  const sourceEmail = from || fromEmail;
  const { date, time } = formatSessionDateTime(startTime);

  const reminderText = reminderType === 'dayBefore' ? 'starts tomorrow' : 'starts in 1 hour';
  const subject =
    reminderType === 'dayBefore'
      ? `Reminder: ${webinarTitle} is tomorrow!`
      : `Starting Soon: ${webinarTitle} in 1 hour!`;

  console.log(`[DBG][email] Sending webinar ${reminderType} reminder to ${to}`);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${reminderType === 'hourBefore' ? '#e53e3e' : '#667eea'} 0%, ${reminderType === 'hourBefore' ? '#c53030' : '#764ba2'} 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
                ${reminderType === 'hourBefore' ? '⏰ Starting Soon!' : '📅 Reminder'}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                Hi ${customerName},
              </p>

              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                Your session <strong>${sessionTitle}</strong> from <strong>${webinarTitle}</strong> ${reminderText}!
              </p>

              <!-- Session Details -->
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #333;">${sessionTitle}</h3>
                <p style="margin: 0 0 8px 0; color: #666;">
                  <strong>Date:</strong> ${date}
                </p>
                <p style="margin: 0 0 8px 0; color: #666;">
                  <strong>Time:</strong> ${time}
                </p>
                <p style="margin: 0; color: #666;">
                  <strong>Duration:</strong> ${duration} minutes
                </p>
              </div>

              ${
                meetLink
                  ? `
              <!-- Join Button -->
              <div style="text-align: center; margin-bottom: 25px;">
                <a href="${meetLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                  Join Google Meet
                </a>
              </div>

              <p style="font-size: 14px; color: #666; text-align: center; margin: 0 0 20px 0;">
                Or copy this link: <br/>
                <a href="${meetLink}" style="color: #667eea; word-break: break-all;">${meetLink}</a>
              </p>
              `
                  : `
              <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                  <strong>Note:</strong> The meeting link will be available on your webinar page.
                </p>
              </div>
              `
              }

              <p style="font-size: 14px; color: #666; margin: 0;">
                We look forward to seeing you there!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #888;">
                &copy; ${new Date().getFullYear()} MyYoga.guru. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
Hi ${customerName},

Your session "${sessionTitle}" from "${webinarTitle}" ${reminderText}!

SESSION DETAILS
- Date: ${date}
- Time: ${time}
- Duration: ${duration} minutes

${meetLink ? `JOIN LINK: ${meetLink}` : 'The meeting link will be available on your webinar page.'}

We look forward to seeing you there!

© ${new Date().getFullYear()} MyYoga.guru. All rights reserved.
`;

  const command = new SendEmailCommand({
    Source: sourceEmail,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: text,
          Charset: 'UTF-8',
        },
        Html: {
          Data: html,
          Charset: 'UTF-8',
        },
      },
    },
    ConfigurationSetName: configSet,
    Tags: [
      {
        Name: 'EmailType',
        Value: `webinar-reminder-${reminderType}`,
      },
    ],
  });

  try {
    const response = await sesClient.send(command);
    console.log(
      `[DBG][email] Webinar reminder email sent successfully. MessageId: ${response.MessageId}`
    );
  } catch (error) {
    console.error('[DBG][email] Error sending webinar reminder email:', error);
    throw error;
  }
};

// ========================================
// Reply Email Function (for Inbox feature)
// ========================================

export interface ReplyEmailOptions {
  expertId: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  attachmentLinks?: string[]; // Cloudflare URLs to insert as links
}

/**
 * Send a reply email from an expert
 * Uses the expert's verified email (BYOD or platform email)
 *
 * @param options - Reply email options
 * @returns Promise resolving to the SES message ID
 */
export async function sendReplyEmail(options: ReplyEmailOptions): Promise<string> {
  // Note: _inReplyTo is extracted but not used yet - SendEmail API doesn't support custom headers
  // To add In-Reply-To and References headers, would need to use SendRawEmail
  const { expertId, to, subject, text, html, inReplyTo: _inReplyTo, attachmentLinks } = options;

  console.log(`[DBG][email] Sending reply email for expert: ${expertId}`);
  console.log(`[DBG][email] To: ${to}, Subject: ${subject}`);

  // Get the from email for this expert
  const from = await getFromEmailForExpert(expertId);

  // Build HTML body with attachment links if provided
  let htmlBody = html || text.replace(/\n/g, '<br>');

  if (attachmentLinks && attachmentLinks.length > 0) {
    htmlBody += '<br><br><strong>Attachments:</strong><ul>';
    for (const link of attachmentLinks) {
      // Extract filename from URL
      const filename = link.split('/').pop() || 'Attachment';
      htmlBody += `<li><a href="${link}" target="_blank">${filename}</a></li>`;
    }
    htmlBody += '</ul>';
  }

  // Build text body with attachment links
  let textBody = text;
  if (attachmentLinks && attachmentLinks.length > 0) {
    textBody += '\n\nAttachments:\n';
    for (const link of attachmentLinks) {
      textBody += `- ${link}\n`;
    }
  }

  const command = new SendEmailCommand({
    Source: from,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: textBody,
          Charset: 'UTF-8',
        },
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
      },
    },
    ReplyToAddresses: [from],
    ConfigurationSetName: configSet,
    Tags: [
      {
        Name: 'EmailType',
        Value: 'inbox-reply',
      },
    ],
  });

  try {
    const response = await sesClient.send(command);
    console.log(`[DBG][email] Reply email sent successfully. MessageId: ${response.MessageId}`);
    return response.MessageId || '';
  } catch (error) {
    console.error('[DBG][email] Error sending reply email:', error);
    throw error;
  }
}

// ========================================
// Admin Reply Email Function (for Admin Inbox)
// ========================================

export interface AdminReplyEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  attachmentLinks?: string[];
}

/**
 * Send a reply email from the admin inbox (hi@myyoga.guru)
 * Used for replying to platform emails (hi@, contact@, privacy@)
 *
 * @param options - Reply email options
 * @returns Promise resolving to the SES message ID
 */
export async function sendAdminReplyEmail(options: AdminReplyEmailOptions): Promise<string> {
  const { to, subject, text, html, inReplyTo: _inReplyTo, attachmentLinks } = options;

  console.log(`[DBG][email] Sending admin reply email`);
  console.log(`[DBG][email] To: ${to}, Subject: ${subject}`);

  // Admin replies always come from hi@myyoga.guru
  const from = 'hi@myyoga.guru';

  // Build HTML body with attachment links if provided
  let htmlBody = html || text.replace(/\n/g, '<br>');

  if (attachmentLinks && attachmentLinks.length > 0) {
    htmlBody += '<br><br><strong>Attachments:</strong><ul>';
    for (const link of attachmentLinks) {
      const filename = link.split('/').pop() || 'Attachment';
      htmlBody += `<li><a href="${link}" target="_blank">${filename}</a></li>`;
    }
    htmlBody += '</ul>';
  }

  // Build text body with attachment links
  let textBody = text;
  if (attachmentLinks && attachmentLinks.length > 0) {
    textBody += '\n\nAttachments:\n';
    for (const link of attachmentLinks) {
      textBody += `- ${link}\n`;
    }
  }

  const command = new SendEmailCommand({
    Source: from,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: textBody,
          Charset: 'UTF-8',
        },
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
      },
    },
    ReplyToAddresses: [from],
    ConfigurationSetName: configSet,
    Tags: [
      {
        Name: 'EmailType',
        Value: 'admin-reply',
      },
    ],
  });

  try {
    const response = await sesClient.send(command);
    console.log(
      `[DBG][email] Admin reply email sent successfully. MessageId: ${response.MessageId}`
    );
    return response.MessageId || '';
  } catch (error) {
    console.error('[DBG][email] Error sending admin reply email:', error);
    throw error;
  }
}

// ========================================
// Expert Welcome Email
// ========================================

export interface ExpertWelcomeEmailOptions {
  to: string;
  expertName: string;
  expertId: string;
}

/**
 * Send a welcome email to a new expert after onboarding
 * @param options - Expert welcome email options
 * @returns Promise that resolves when email is sent
 */
export const sendExpertWelcomeEmail = async (options: ExpertWelcomeEmailOptions): Promise<void> => {
  const { to, expertName, expertId } = options;

  const subdomain = `${expertId}.myyoga.guru`;
  const dashboardUrl = `https://${subdomain}/srv/${expertId}`;
  const expertEmail = `${expertId}@myyoga.guru`;

  console.log(`[DBG][email] Sending expert welcome email to ${to}`);
  console.log(`[DBG][email] Expert: ${expertName} (${expertId})`);

  // Brand colors from globals.css
  const brandPrimary = '#7a2900';
  const brandPrimaryLight = '#fed094';
  const logoUrl = 'https://myyoga.guru/myg_light.png';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #faf8f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf8f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(122, 41, 0, 0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="background: ${brandPrimary}; padding: 35px 30px; text-align: center;">
              <img src="${logoUrl}" alt="MyYoga.guru" width="180" style="display: block; margin: 0 auto 15px auto;" />
              <p style="color: ${brandPrimaryLight}; margin: 0; font-size: 16px; font-weight: 500;">
                Your journey as an expert begins here
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #333; margin: 0 0 20px 0;">
                Hi ${expertName},
              </p>

              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 25px 0;">
                Congratulations on joining MyYoga.guru as an expert! We're thrilled to have you on board. Your expertise will help transform lives through yoga.
              </p>

              <!-- What's Ready Box -->
              <div style="background: ${brandPrimaryLight}; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 4px solid ${brandPrimary};">
                <h2 style="margin: 0 0 15px 0; font-size: 18px; color: ${brandPrimary};">
                  What's ready for you:
                </h2>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 10px 0;">
                      <strong style="color: #333;">Your subdomain:</strong><br/>
                      <a href="https://${subdomain}" style="color: ${brandPrimary}; text-decoration: none; font-weight: 500;">${subdomain}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <strong style="color: #333;">Your email address:</strong><br/>
                      <span style="color: #555;">${expertEmail}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <strong style="color: #333;">Expert dashboard:</strong><br/>
                      <a href="${dashboardUrl}" style="color: ${brandPrimary}; text-decoration: none; font-weight: 500;">Access your dashboard</a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Next Steps -->
              <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #333;">
                Next steps to get started:
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 36px; vertical-align: top;">
                          <div style="width: 28px; height: 28px; background: ${brandPrimary}; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px;">1</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <strong style="color: #333;">Customize your landing page</strong><br/>
                          <span style="color: #666; font-size: 14px;">Add your bio, photos, and showcase your expertise</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 36px; vertical-align: top;">
                          <div style="width: 28px; height: 28px; background: ${brandPrimary}; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px;">2</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <strong style="color: #333;">Create your first course</strong><br/>
                          <span style="color: #666; font-size: 14px;">Share your knowledge through video courses</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 36px; vertical-align: top;">
                          <div style="width: 28px; height: 28px; background: ${brandPrimary}; color: #fff; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px;">3</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <strong style="color: #333;">Connect payment</strong><br/>
                          <span style="color: #666; font-size: 14px;">Set up Stripe to receive payments for your courses</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="display: inline-block; background: ${brandPrimary}; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                  Go to Your Dashboard
                </a>
              </div>

              <p style="font-size: 14px; color: #888; margin: 25px 0 0 0; text-align: center;">
                Questions? Just reply to this email - we're here to help!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${brandPrimary}; padding: 25px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: ${brandPrimaryLight};">
                Empowering yoga experts to share their knowledge
              </p>
              <p style="margin: 15px 0 0 0; font-size: 12px; color: rgba(254, 208, 148, 0.7);">
                &copy; ${new Date().getFullYear()} MyYoga.guru. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
Welcome to MyYoga.guru!

Hi ${expertName},

Congratulations on joining MyYoga.guru as an expert! We're thrilled to have you on board. Your expertise will help transform lives through yoga.

WHAT'S READY FOR YOU:
- Your subdomain: ${subdomain}
- Your email address: ${expertEmail}
- Expert dashboard: ${dashboardUrl}

NEXT STEPS TO GET STARTED:

1. Customize your landing page
   Add your bio, photos, and showcase your expertise

2. Create your first course
   Share your knowledge through video courses

3. Connect payment
   Set up Stripe to receive payments for your courses

Go to your dashboard: ${dashboardUrl}

Questions? Just reply to this email - we're here to help!

---
MyYoga.guru
Empowering yoga experts to share their knowledge

(c) ${new Date().getFullYear()} MyYoga.guru. All rights reserved.
`;

  const command = new SendEmailCommand({
    Source: fromEmail,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: `Welcome to MyYoga.guru, ${expertName}!`,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: text,
          Charset: 'UTF-8',
        },
        Html: {
          Data: html,
          Charset: 'UTF-8',
        },
      },
    },
    ReplyToAddresses: ['hi@myyoga.guru'],
    ConfigurationSetName: configSet,
    Tags: [
      {
        Name: 'EmailType',
        Value: 'expert-welcome',
      },
    ],
  });

  try {
    const response = await sesClient.send(command);
    console.log(
      `[DBG][email] Expert welcome email sent successfully. MessageId: ${response.MessageId}`
    );
  } catch (error) {
    console.error('[DBG][email] Error sending expert welcome email:', error);
    throw error;
  }
};
