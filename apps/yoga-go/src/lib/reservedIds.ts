/**
 * Reserved Expert IDs
 *
 * These IDs cannot be used as expert IDs to prevent:
 * 1. Email spoofing (e.g., payments@myyoga.guru)
 * 2. Impersonation of official platform accounts
 * 3. Confusion with system/technical addresses
 */

import OpenAI from 'openai';

// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Platform email addresses (from email-forwarder)
const PLATFORM_EMAILS = ['hi', 'contact', 'privacy', 'support', 'info', 'admin', 'noreply', 'mail'];

// Financial - could be used for payment scams
const FINANCIAL = [
  'payment',
  'payments',
  'billing',
  'invoice',
  'invoices',
  'refund',
  'refunds',
  'paypal',
  'stripe',
  'razorpay',
  'finance',
  'accounting',
  'accounts',
  'subscription',
  'subscriptions',
];

// Security - could be used for phishing
const SECURITY = [
  'security',
  'secure',
  'account',
  'accounts',
  'verify',
  'verification',
  'confirm',
  'confirmation',
  'password',
  'reset',
  'login',
  'signin',
  'signup',
  'auth',
  'authentication',
  'oauth',
  'sso',
  '2fa',
  'mfa',
];

// Official sounding - impersonation risk
const OFFICIAL = [
  'team',
  'staff',
  'official',
  'help',
  'helpdesk',
  'service',
  'services',
  'customer',
  'customers',
  'customerservice',
  'customersupport',
  'ceo',
  'cto',
  'cfo',
  'founder',
  'cofounder',
  'hr',
  'hiring',
  'jobs',
  'careers',
  'press',
  'media',
  'pr',
  'partner',
  'partners',
  'affiliate',
  'affiliates',
  'myyoga',
  'myyogaguru',
  'yogaguru',
  'always',
  'forever',
];

// Technical/System - confusion with infrastructure
const TECHNICAL = [
  'api',
  'system',
  'systems',
  'notification',
  'notifications',
  'alert',
  'alerts',
  'update',
  'updates',
  'status',
  'monitor',
  'monitoring',
  'logs',
  'debug',
  'test',
  'testing',
  'dev',
  'development',
  'staging',
  'prod',
  'production',
  'beta',
  'alpha',
  'demo',
  'root',
  'superuser',
  'superadmin',
  'sysadmin',
];

// Internet/Email standards
const INTERNET_STANDARDS = [
  'www',
  'web',
  'mail',
  'email',
  'ftp',
  'sftp',
  'smtp',
  'imap',
  'pop',
  'pop3',
  'dns',
  'ns',
  'ns1',
  'ns2',
  'mx',
  'autodiscover',
  'autoconfig',
  'webmail',
  'postmaster',
  'hostmaster',
  'webmaster',
  'abuse',
  'spam',
  'mailer-daemon',
  'mailerdaemon',
  'bounce',
  'bounces',
];

// Marketing/Communications
const MARKETING = [
  'newsletter',
  'newsletters',
  'news',
  'promo',
  'promos',
  'promotions',
  'marketing',
  'sales',
  'deals',
  'offer',
  'offers',
  'discount',
  'discounts',
  'campaign',
  'campaigns',
  'broadcast',
  'announce',
  'announcements',
];

// Legal/Compliance
const LEGAL = [
  'legal',
  'compliance',
  'dmca',
  'copyright',
  'trademark',
  'tos',
  'terms',
  'gdpr',
  'dpo',
];

// Platform specific
const PLATFORM_SPECIFIC = [
  'myyoga',
  'myyogaguru',
  'yogago',
  'yoga-go',
  'yogaguru',
  'guru',
  'platform',
  'marketplace',
  'course',
  'courses',
  'expert',
  'experts',
  'learner',
  'learners',
  'instructor',
  'instructors',
  'teacher',
  'teachers',
];

// Combine all reserved IDs
export const RESERVED_EXPERT_IDS = new Set([
  ...PLATFORM_EMAILS,
  ...FINANCIAL,
  ...SECURITY,
  ...OFFICIAL,
  ...TECHNICAL,
  ...INTERNET_STANDARDS,
  ...MARKETING,
  ...LEGAL,
  ...PLATFORM_SPECIFIC,
]);

/**
 * Check if an expert ID is reserved/blocked
 * @param id - The expert ID to check
 * @returns true if the ID is reserved and cannot be used
 */
export function isReservedExpertId(id: string): boolean {
  const normalizedId = id.toLowerCase().trim();
  return RESERVED_EXPERT_IDS.has(normalizedId);
}

/**
 * Validate an expert ID
 * @param id - The expert ID to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateExpertId(id: string): { isValid: boolean; error?: string } {
  const normalizedId = id.toLowerCase().trim();

  // Check minimum length
  if (normalizedId.length < 3) {
    return { isValid: false, error: 'Expert ID must be at least 3 characters long' };
  }

  // Check maximum length
  if (normalizedId.length > 30) {
    return { isValid: false, error: 'Expert ID must be 30 characters or less' };
  }

  // Check for valid characters (alphanumeric, hyphens, underscores)
  if (!/^[a-z0-9_-]+$/.test(normalizedId)) {
    return {
      isValid: false,
      error: 'Expert ID can only contain lowercase letters, numbers, hyphens, and underscores',
    };
  }

  // Check if reserved
  if (isReservedExpertId(normalizedId)) {
    return {
      isValid: false,
      error: 'This ID cannot be used. Please choose a different ID.',
    };
  }

  return { isValid: true };
}

/**
 * AI-powered validation response
 */
interface AIValidationResponse {
  rejected: boolean;
  reason: string;
}

/**
 * Validation result with different rejection types
 */
export interface ExpertIdValidationResult {
  isValid: boolean;
  /** Hard rejection - ID cannot be used at all */
  hardRejection?: boolean;
  /** Soft rejection - ID flagged for review, account can be created but not published */
  flaggedForReview?: boolean;
  /** Reason for AI flagging (stored for admin review) */
  flagReason?: string;
  /** Error message to show user */
  error?: string;
}

/**
 * AI-powered expert ID validation
 *
 * Two-layer validation:
 * 1. Hard blocklist - instant rejection, cannot create account
 * 2. AI validation - if flagged, can create account but flagged for review
 *
 * @param id - The expert ID to validate
 * @returns Validation result with rejection type
 */
export async function validateExpertIdWithAI(id: string): Promise<ExpertIdValidationResult> {
  const normalizedId = id.toLowerCase().trim();

  // LAYER 1: Hard blocklist check - instant rejection
  const basicValidation = validateExpertId(normalizedId);
  if (!basicValidation.isValid) {
    return {
      isValid: false,
      hardRejection: true,
      error: basicValidation.error || 'This ID is not allowed. Please choose a different one.',
    };
  }

  // LAYER 2: AI validation - soft rejection (flagged for review)
  // Skip AI validation if no API key configured
  if (!process.env.OPENAI_API_KEY) {
    console.log('[DBG][reservedIds] No OpenAI API key, skipping AI validation');
    return { isValid: true };
  }

  try {
    const client = getOpenAIClient();

    const systemPrompt = `You are a security and compliance expert responsible for validating usernames on a yoga teaching platform (myyoga.guru). Your role is to filter out usernames that are:

1. **Profane, obscene, or offensive** - Including slurs, vulgar terms, sexual references, or hate speech. Also catch creative spellings, leetspeak variations (e.g., "a55", "sh1t", "f4ck"), or phonetic equivalents.

2. **Potentially malicious or deceptive** - Usernames that could be used for:
   - Impersonation of official accounts (e.g., "admin", "support", "payments", "security")
   - Phishing attempts (e.g., "verify-account", "billing-dept")
   - Fraud (e.g., "refunds", "paypal-support")
   - Include variations with numbers, underscores, or hyphens (e.g., "adm1n", "pay_ments", "supp0rt")

3. **Inappropriate for a yoga platform** - Usernames that are:
   - Violent or aggressive
   - Drug-related
   - Politically charged or divisive
   - Sexually suggestive

**ALLOW usernames that are:**
- Proper names (e.g., "sarah", "deepak", "maria-garcia")
- Yoga-related terms (e.g., "yogawithmike", "sunrise-yoga", "peacefulpractice")
- Teaching-related (e.g., "instructor-jane", "yogateacher")
- Neutral/positive words (e.g., "wellness", "mindful", "balance")

**When in doubt, REJECT the username.** It's better to be cautious than to allow potentially harmful usernames.

Respond ONLY with valid JSON in this exact format:
{"rejected": true/false, "reason": "Brief explanation"}`;

    const userPrompt = `Validate this username for a yoga teaching platform: "${normalizedId}"`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 150,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.log('[DBG][reservedIds] Empty AI response, allowing ID');
      return { isValid: true };
    }

    const result: AIValidationResponse = JSON.parse(content);
    console.log('[DBG][reservedIds] AI validation result:', { id: normalizedId, result });

    if (result.rejected) {
      // AI flagged - allow account creation but flag for review
      return {
        isValid: true, // Can create account
        flaggedForReview: true,
        flagReason: result.reason || 'Flagged by automated review',
        error:
          'Your expert ID has been flagged for review. You can set up your profile, but you will not be able to publish until the review is complete.',
      };
    }

    return { isValid: true };
  } catch (error) {
    // Log error but don't block on AI failure - fall back to basic validation
    console.error('[DBG][reservedIds] AI validation error:', error);
    return { isValid: true };
  }
}
