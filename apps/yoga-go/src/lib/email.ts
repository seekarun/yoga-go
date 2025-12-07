import { SESClient, SendEmailCommand, SendTemplatedEmailCommand } from '@aws-sdk/client-ses';

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
// Expert Email Helper
// ========================================

/**
 * Get the default email address for an expert
 */
export function getExpertFromEmail(expertId: string): string {
  return `${expertId}@myyoga.guru`;
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
