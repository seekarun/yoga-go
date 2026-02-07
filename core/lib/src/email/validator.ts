// Core Email Validator
// Provides comprehensive email validation including format, disposable domain,
// MX record, and optional DeBounce API checks.

import { promises as dns } from "dns";
import { DISPOSABLE_EMAIL_DOMAINS } from "./disposable-domains";

// Email format regex - validates basic email structure
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Configuration for email validation
 */
export interface EmailValidatorConfig {
  /** DeBounce API key for real-time validation (optional) */
  debounceApiKey?: string;
  /** Skip MX record check (useful for testing) */
  skipMxCheck?: boolean;
  /** Skip DeBounce API check even if key is provided */
  skipDebounceCheck?: boolean;
}

/**
 * Result of email validation
 */
export interface EmailValidationResult {
  /** Whether the email is valid */
  valid: boolean;
  /** Reason for validation failure (if invalid) */
  reason?:
    | "invalid_format"
    | "disposable_email"
    | "no_mx_record"
    | "debounce_invalid";
  /** Human-readable error message */
  message?: string;
  /** Email domain extracted from the address */
  domain?: string;
  /** Whether MX record was found */
  mxRecordFound?: boolean;
  /** DeBounce API result (if checked) */
  debounceResult?: string;
}

/**
 * DeBounce API response structure
 */
interface DeBounceResponse {
  debounce: {
    email: string;
    code: string;
    role: string;
    free_email: string;
    result: "Invalid" | "Risky" | "Safe to Send" | "Unknown";
    reason: string;
    send_transactional: string;
    did_you_mean: string;
  };
  success: string;
  balance: string;
}

/**
 * Extract domain from email address
 */
function getEmailDomain(email: string): string | null {
  const parts = email.toLowerCase().trim().split("@");
  if (parts.length !== 2) return null;
  return parts[1];
}

/**
 * Check if email matches valid format using regex
 */
function isValidFormat(email: string): boolean {
  return EMAIL_REGEX.test(email.toLowerCase().trim());
}

/**
 * Check if domain is a known disposable/temporary email provider
 */
function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_EMAIL_DOMAINS.has(domain.toLowerCase());
}

/**
 * Check if domain has MX DNS records (mail servers configured)
 */
async function hasMxRecord(domain: string): Promise<boolean> {
  try {
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords && mxRecords.length > 0;
  } catch {
    // DNS lookup failed - domain likely has no MX records
    return false;
  }
}

/**
 * Validate email using DeBounce API
 * Returns whether the email is valid for sending transactional emails
 */
async function validateWithDeBounce(
  email: string,
  apiKey: string,
): Promise<{ valid: boolean; reason?: string; result?: string }> {
  console.log(`[DBG][email-validator] Validating with DeBounce: ${email}`);

  try {
    const url = new URL("https://api.debounce.io/v1/");
    url.searchParams.set("api", apiKey);
    url.searchParams.set("email", email);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.error(
        `[DBG][email-validator] DeBounce API error: ${response.status}`,
      );
      // On API error, allow the email through - we'll catch bounces later
      return { valid: true };
    }

    const data = (await response.json()) as DeBounceResponse;

    console.log(`[DBG][email-validator] DeBounce result:`, {
      email: data.debounce.email,
      result: data.debounce.result,
      reason: data.debounce.reason,
      send_transactional: data.debounce.send_transactional,
      balance: data.balance,
    });

    // Check if email is safe for transactional emails
    // send_transactional = "1" means OK to send
    if (data.debounce.send_transactional === "1") {
      return { valid: true, result: data.debounce.result };
    }

    // Email is not safe to send - reject it
    return {
      valid: false,
      reason: data.debounce.reason,
      result: data.debounce.result,
    };
  } catch (error) {
    console.error(`[DBG][email-validator] DeBounce API error:`, error);
    // On error, allow the email through - we'll catch bounces later
    return { valid: true };
  }
}

/**
 * Validate an email address
 *
 * Performs the following checks in order:
 * 1. Format validation (regex)
 * 2. Disposable email domain check
 * 3. MX DNS record check (unless skipMxCheck is true)
 * 4. DeBounce API validation (if API key provided and skipDebounceCheck is false)
 *
 * @param email - The email address to validate
 * @param config - Optional configuration for validation
 * @returns Validation result with valid flag and details
 *
 * @example
 * ```typescript
 * // Basic validation (format + disposable + MX)
 * const result = await isValidEmail("user@example.com");
 * if (!result.valid) {
 *   console.log(`Invalid: ${result.message}`);
 * }
 *
 * // With DeBounce API for real-time validation
 * const result = await isValidEmail("user@example.com", {
 *   debounceApiKey: process.env.DEBOUNCE_API_KEY,
 * });
 * ```
 */
export async function isValidEmail(
  email: string,
  config: EmailValidatorConfig = {},
): Promise<EmailValidationResult> {
  const {
    debounceApiKey,
    skipMxCheck = false,
    skipDebounceCheck = false,
  } = config;

  const normalizedEmail = email.toLowerCase().trim();

  // Check 1: Format validation
  if (!isValidFormat(normalizedEmail)) {
    console.log(`[DBG][email-validator] Invalid format: ${normalizedEmail}`);
    return {
      valid: false,
      reason: "invalid_format",
      message: "Email format is invalid",
    };
  }

  // Extract domain
  const domain = getEmailDomain(normalizedEmail);
  if (!domain) {
    return {
      valid: false,
      reason: "invalid_format",
      message: "Could not extract domain from email",
    };
  }

  // Check 2: Disposable email domain
  if (isDisposableDomain(domain)) {
    console.log(`[DBG][email-validator] Disposable domain: ${domain}`);
    return {
      valid: false,
      reason: "disposable_email",
      message: "Disposable email addresses are not allowed",
      domain,
    };
  }

  // Check 3: MX DNS record
  if (!skipMxCheck) {
    const hasMx = await hasMxRecord(domain);
    if (!hasMx) {
      console.log(`[DBG][email-validator] No MX record for: ${domain}`);
      return {
        valid: false,
        reason: "no_mx_record",
        message: "Email domain does not have mail servers configured",
        domain,
        mxRecordFound: false,
      };
    }
  }

  // Check 4: DeBounce API validation
  if (debounceApiKey && !skipDebounceCheck) {
    const debounceResult = await validateWithDeBounce(
      normalizedEmail,
      debounceApiKey,
    );
    if (!debounceResult.valid) {
      console.log(
        `[DBG][email-validator] DeBounce rejected: ${normalizedEmail} (${debounceResult.reason})`,
      );
      return {
        valid: false,
        reason: "debounce_invalid",
        message: debounceResult.reason || "Email failed verification",
        domain,
        mxRecordFound: true,
        debounceResult: debounceResult.result,
      };
    }
  }

  // All checks passed
  console.log(`[DBG][email-validator] Valid email: ${normalizedEmail}`);
  return {
    valid: true,
    domain,
    mxRecordFound: !skipMxCheck ? true : undefined,
  };
}

/**
 * Quick format-only validation (synchronous)
 * Use this when you only need to check email format without network calls
 */
export function isValidEmailFormat(email: string): boolean {
  return isValidFormat(email);
}

/**
 * Check if an email domain is disposable (synchronous)
 */
export function isDisposableEmail(email: string): boolean {
  const domain = getEmailDomain(email);
  if (!domain) return false;
  return isDisposableDomain(domain);
}
