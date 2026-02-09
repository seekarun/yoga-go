import type { SpamCheckResult } from "@core/types";

/**
 * Checks if the honeypot field was filled (bots tend to fill hidden fields).
 * Returns a failing result if _hp has a value.
 */
export function checkHoneypot(
  body: Record<string, unknown>,
): SpamCheckResult | null {
  const hp = body._hp;
  if (typeof hp === "string" && hp.length > 0) {
    console.log("[DBG][spam-protection] Honeypot triggered");
    return { passed: false, reason: "honeypot" };
  }
  return null;
}
