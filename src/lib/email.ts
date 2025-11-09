import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY;

if (!apiKey) {
  console.warn('[DBG][email] SENDGRID_API_KEY is not set. Email functionality will not work.');
} else {
  sgMail.setApiKey(apiKey);
  console.log('[DBG][email] SendGrid initialized successfully');
}

export interface EmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email using SendGrid
 * @param options - Email options including to, from, subject, text, and optional html
 * @returns Promise that resolves when email is sent
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is not configured. Cannot send emails.');
  }

  const {
    to,
    from = process.env.SENDGRID_FROM_EMAIL || 'hi@myyoga.guru',
    subject,
    text,
    html,
  } = options;

  console.log(`[DBG][email] Sending email to ${Array.isArray(to) ? to.join(', ') : to}`);
  console.log(`[DBG][email] Subject: ${subject}`);

  try {
    const msg = {
      to,
      from,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    };

    await sgMail.send(msg);
    console.log('[DBG][email] Email sent successfully');
  } catch (error) {
    console.error('[DBG][email] Error sending email:', error);
    throw error;
  }
};

/**
 * Send emails to multiple recipients
 * @param options - Email options with array of recipients
 * @returns Promise that resolves when all emails are sent
 */
export const sendBulkEmail = async (options: EmailOptions): Promise<void> => {
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is not configured. Cannot send emails.');
  }

  const {
    to,
    from = process.env.SENDGRID_FROM_EMAIL || 'hi@myyoga.guru',
    subject,
    text,
    html,
  } = options;

  const recipients = Array.isArray(to) ? to : [to];

  console.log(`[DBG][email] Sending bulk email to ${recipients.length} recipients`);
  console.log(`[DBG][email] Subject: ${subject}`);

  try {
    const msg = {
      to: recipients,
      from,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    };

    await sgMail.sendMultiple(msg);
    console.log(`[DBG][email] Bulk email sent successfully to ${recipients.length} recipients`);
  } catch (error) {
    console.error('[DBG][email] Error sending bulk email:', error);
    throw error;
  }
};
