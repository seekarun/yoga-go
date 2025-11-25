import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY;

if (!apiKey) {
  console.warn('[email] SENDGRID_API_KEY is not set. Email functionality will not work.');
} else {
  sgMail.setApiKey(apiKey);
}

export interface EmailOptions {
  to: string | string[];
  from?: string | { email: string; name: string };
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
    from = {
      email: process.env.SENDGRID_FROM_EMAIL || 'hi@myyoga.guru',
      name: 'My Yoga.Guru',
    },
    subject,
    text,
    html,
  } = options;

  try {
    const msg = {
      to,
      from,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    };

    await sgMail.send(msg);
  } catch (error) {
    console.error('[email] Error sending email:', error);
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
    from = {
      email: process.env.SENDGRID_FROM_EMAIL || 'hi@myyoga.guru',
      name: 'My Yoga.Guru',
    },
    subject,
    text,
    html,
  } = options;

  const recipients = Array.isArray(to) ? to : [to];

  try {
    const msg = {
      to: recipients,
      from,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    };

    await sgMail.sendMultiple(msg);
  } catch (error) {
    console.error('[email] Error sending bulk email:', error);
    throw error;
  }
};
