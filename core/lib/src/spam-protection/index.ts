import type { SpamCheckResult, SpamProtectionOptions } from "@core/types";
import { checkHoneypot } from "./honeypot";
import { checkTiming } from "./timing";
import { checkRateLimit } from "./rateLimiter";

/**
 * Runs a three-layer spam protection pipeline (cheapest first):
 * 1. Honeypot — rejects if hidden field was filled
 * 2. Timing — rejects if form submitted < minSubmitSeconds after load
 * 3. Rate limit — rejects if IP exceeded maxRequests in windowMinutes
 *
 * Short-circuits on the first failure.
 */
export async function checkSpamProtection(
  headers: Headers,
  body: Record<string, unknown>,
  options: SpamProtectionOptions,
): Promise<SpamCheckResult> {
  const {
    tableName,
    maxRequests = 5,
    windowMinutes = 15,
    minSubmitSeconds = 3,
  } = options;

  // Layer 1: Honeypot
  const honeypotResult = checkHoneypot(body);
  if (honeypotResult) return honeypotResult;

  // Layer 2: Timing
  const timingResult = checkTiming(body, minSubmitSeconds);
  if (timingResult) return timingResult;

  // Layer 3: Rate limit (requires IP)
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : null;

  if (!ip) {
    // Local dev or unknown IP — skip rate limiting
    return { passed: true };
  }

  const rateLimitResult = await checkRateLimit(
    ip,
    tableName,
    maxRequests,
    windowMinutes,
  );

  if (rateLimitResult) return rateLimitResult;

  return { passed: true };
}
