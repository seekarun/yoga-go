/**
 * Email Templates for MyYoga.Guru
 *
 * This file contains configurable email templates for different user types.
 * All templates share a consistent header/footer design with logo.
 */

import type { UserRole } from '@/types';

// =============================================================================
// EMAIL CONFIGURATION - Modify this section to change email content
// =============================================================================

export const EMAIL_CONFIG = {
  // Learner welcome email configuration
  learner: {
    subject: 'Welcome to My Yoga.Guru - Start Your Yoga Journey!',
    heading: 'Welcome to My Yoga.Guru!',
    subheading: 'Your yoga journey begins here',
    greeting: "We're thrilled to have you join our community of yoga enthusiasts!",
    ctaText: 'Start Your First Lesson',
    ctaPath: '/app',
    features: [
      'Browse expert-led yoga courses',
      'Start with free lessons to find your perfect style',
      'Track your progress and build healthy habits',
      'Connect with certified yoga instructors',
    ],
    closingText: 'Questions? Just reply to this email.',
  },

  // Expert welcome email configuration
  expert: {
    subject: 'Welcome to My Yoga.Guru Expert Platform!',
    heading: 'Welcome to My Yoga.Guru!',
    subheading: "You're now part of our expert community",
    greeting:
      "Congratulations! You're now part of an exclusive community of yoga instructors sharing their expertise with students worldwide.",
    ctaText: 'Open Expert Dashboard',
    ctaPath: '/srv',
    steps: [
      { title: 'Complete Your Expert Profile', desc: 'Add your bio, certifications, and photo' },
      { title: 'Create Your First Course', desc: 'Upload videos and organize lessons' },
      { title: 'Customize Your Landing Page', desc: 'Make it uniquely yours' },
      { title: 'Set Your Prices', desc: 'You control your earnings' },
    ],
    closingText: 'Need help? Our expert support team is here for you.',
  },

  // Branding configuration - applies to all emails
  branding: {
    primaryColor: '#667eea',
    gradientEnd: '#764ba2',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'hi@myyoga.guru',
    fromName: 'My Yoga.Guru',
    companyName: 'My Yoga.Guru',
    signoff: 'Namaste,\nMy Yoga.Guru Team',
    tagline: 'Your Yoga Journey Starts Here',
    logoUrl: 'https://www.myyoga.guru/myg.png',
    logoHeight: '60',
    websiteUrl: 'https://myyoga.guru',
    footerLinks: [
      { text: 'About Us', url: 'https://myyoga.guru/about' },
      { text: 'Our Experts', url: 'https://myyoga.guru/experts' },
      { text: 'Contact', url: 'https://myyoga.guru/contact' },
    ],
    footerTagline: 'Your journey to wellness starts here',
  },
};

// Get the base URL dynamically from environment
export const getBaseUrl = (): string => {
  return process.env.AUTH0_BASE_URL || 'https://myyoga.guru';
};

// =============================================================================
// TYPES
// =============================================================================

export interface WelcomeEmailData {
  userName: string;
  userEmail: string;
  role: UserRole;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

interface GenerateEmailOptions {
  bodyContent: string;
  showBadge?: boolean;
  badgeText?: string;
}

// =============================================================================
// SHARED EMAIL TEMPLATE
// =============================================================================

/**
 * Generate the base HTML email template with consistent header/footer
 */
function generateEmailHtml(options: GenerateEmailOptions): string {
  const { bodyContent, showBadge = false, badgeText = '' } = options;
  const branding = EMAIL_CONFIG.branding;
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f8f8f8;
      line-height: 1.6;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.gradientEnd} 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo-img {
      height: ${branding.logoHeight}px;
      width: auto;
      margin: 0 auto 20px auto;
      display: block;
    }
    .logo-text {
      font-size: 36px;
      font-weight: bold;
      color: #ffffff !important;
      margin: 0;
      letter-spacing: 1px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .badge {
      background: rgba(255,255,255,0.2);
      padding: 6px 16px;
      border-radius: 20px;
      display: inline-block;
      margin-bottom: 12px;
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      font-weight: 600;
      color: #2d3748;
      margin: 0 0 20px 0;
    }
    .text {
      font-size: 16px;
      color: #4a5568;
      margin: 0 0 20px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.gradientEnd} 100%);
      color: #ffffff !important;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    .features {
      background-color: #f7fafc;
      border-left: 4px solid ${branding.primaryColor};
      padding: 20px;
      margin: 30px 0;
    }
    .features-title {
      font-size: 18px;
      font-weight: 600;
      color: #2d3748;
      margin: 0 0 15px 0;
    }
    .features-list {
      margin: 0;
      padding-left: 20px;
    }
    .features-list li {
      color: #4a5568;
      margin-bottom: 8px;
      font-size: 15px;
    }
    .steps {
      margin: 24px 0;
    }
    .step {
      padding: 16px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .step:last-child {
      border-bottom: none;
    }
    .step-number {
      background: ${branding.primaryColor};
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      text-align: center;
      line-height: 32px;
      font-weight: 600;
      display: inline-block;
      vertical-align: top;
    }
    .step-content {
      display: inline-block;
      vertical-align: top;
      padding-left: 12px;
      width: calc(100% - 50px);
    }
    .step-title {
      font-weight: 600;
      margin-bottom: 4px;
      color: #2d3748;
    }
    .step-desc {
      color: #666;
      font-size: 14px;
    }
    .divider {
      border-top: 1px solid #e2e8f0;
      margin: 30px 0;
    }
    .footer {
      background-color: #2d3748;
      padding: 30px;
      text-align: center;
    }
    .footer-text {
      color: #a0aec0;
      font-size: 14px;
      margin: 0 0 15px 0;
    }
    .footer-links {
      margin: 20px 0;
    }
    .footer-link {
      color: #cbd5e0;
      text-decoration: none;
      margin: 0 15px;
      font-size: 14px;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .greeting {
        font-size: 20px;
      }
      .text {
        font-size: 15px;
      }
      .cta-button {
        padding: 14px 30px;
        font-size: 15px;
      }
    }
  </style>
</head>
<body>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <a href="${branding.websiteUrl}" style="text-decoration:none">
              <img
                alt="${branding.companyName}"
                class="logo-img"
                src="${branding.logoUrl}"
              />
              ${showBadge ? `<div class="badge">${badgeText}</div>` : ''}
              <h1 class="logo-text" style="color:#ffffff !important">${branding.companyName}</h1>
            </a>
          </div>

          <!-- Content -->
          <div class="content">
            ${bodyContent}

            <!-- Divider -->
            <div class="divider"></div>

            <!-- Signature -->
            <p class="text" style="margin-top: 20px;">
              <strong>Namaste,</strong><br>
              ${branding.companyName} Team
            </p>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p class="footer-text">
              &copy; ${currentYear} ${branding.companyName}. All rights reserved.
            </p>

            <div class="footer-links">
              ${branding.footerLinks.map(link => `<a href="${link.url}" class="footer-link">${link.text}</a>`).join('')}
            </div>

            <p class="footer-text" style="font-size: 12px; margin-top: 20px;">
              ${branding.companyName}<br>
              ${branding.footerTagline}
            </p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// =============================================================================
// EMAIL TEMPLATE FUNCTIONS
// =============================================================================

/**
 * Generate welcome email for learner users
 */
export function getLearnerWelcomeEmail(data: WelcomeEmailData): EmailContent {
  const config = EMAIL_CONFIG.learner;
  const branding = EMAIL_CONFIG.branding;
  const baseUrl = getBaseUrl();
  const ctaUrl = `${baseUrl}${config.ctaPath}`;

  const text = `
Hi ${data.userName},

${config.greeting}

Here's what you can do now:
${config.features.map(f => `- ${f}`).join('\n')}

Ready to begin? Log in and start your first lesson today:
${ctaUrl}

${config.closingText}

${branding.signoff.replace('\n', '\n')}
  `.trim();

  const bodyContent = `
    <h2 class="greeting">${config.heading}</h2>
    <p class="text" style="font-size: 14px; color: #718096; margin-bottom: 20px;">${config.subheading}</p>

    <p class="text">Hi ${data.userName},</p>
    <p class="text">${config.greeting}</p>

    <!-- Features Section -->
    <div class="features">
      <p class="features-title">Here's what you can do:</p>
      <ul class="features-list">
        ${config.features.map(feature => `<li>${feature}</li>`).join('')}
      </ul>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${ctaUrl}" class="cta-button" style="color:#ffffff !important">
        ${config.ctaText}
      </a>
    </div>

    <p class="text" style="text-align: center; font-size: 14px; color: #718096;">
      ${config.closingText}
    </p>
  `;

  const html = generateEmailHtml({
    bodyContent,
    showBadge: false,
  });

  return {
    subject: config.subject,
    text,
    html,
  };
}

/**
 * Generate welcome email for expert users
 */
export function getExpertWelcomeEmail(data: WelcomeEmailData): EmailContent {
  const config = EMAIL_CONFIG.expert;
  const branding = EMAIL_CONFIG.branding;
  const baseUrl = getBaseUrl();
  const ctaUrl = `${baseUrl}${config.ctaPath}`;

  const text = `
Hi ${data.userName},

${config.greeting}

Getting Started:
${config.steps.map((step, i) => `${i + 1}. ${step.title} - ${step.desc}`).join('\n')}

Log in to your Expert Dashboard:
${ctaUrl}

${config.closingText}

${branding.signoff.replace('\n', '\n')}
  `.trim();

  const bodyContent = `
    <h2 class="greeting">${config.heading}</h2>
    <p class="text" style="font-size: 14px; color: #718096; margin-bottom: 20px;">${config.subheading}</p>

    <p class="text">Hi ${data.userName},</p>
    <p class="text">${config.greeting}</p>

    <!-- Steps Section -->
    <h3 style="margin: 24px 0 16px 0; color: #2d3748;">Getting Started</h3>
    <div class="steps">
      ${config.steps
        .map(
          (step, i) => `
        <div class="step">
          <div class="step-number">${i + 1}</div>
          <div class="step-content">
            <div class="step-title">${step.title}</div>
            <div class="step-desc">${step.desc}</div>
          </div>
        </div>
      `
        )
        .join('')}
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${ctaUrl}" class="cta-button" style="color:#ffffff !important">
        ${config.ctaText}
      </a>
    </div>

    <p class="text" style="text-align: center; font-size: 14px; color: #718096;">
      ${config.closingText}
    </p>
  `;

  const html = generateEmailHtml({
    bodyContent,
    showBadge: true,
    badgeText: 'Expert',
  });

  return {
    subject: config.subject,
    text,
    html,
  };
}

/**
 * Get welcome email based on role
 */
export function getWelcomeEmail(data: WelcomeEmailData): EmailContent {
  if (data.role === 'expert') {
    return getExpertWelcomeEmail(data);
  }
  return getLearnerWelcomeEmail(data);
}
