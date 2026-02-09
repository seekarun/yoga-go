import type { SpamCheckResult } from "@core/types";

/**
 * Checks if the form was submitted too quickly after loading.
 * Decodes _t (base64-encoded timestamp), rejects if elapsed < minSubmitSeconds.
 * Gracefully skips if the field is missing or malformed.
 */
export function checkTiming(
  body: Record<string, unknown>,
  minSubmitSeconds: number,
): SpamCheckResult | null {
  const t = body._t;
  if (typeof t !== "string" || t.length === 0) {
    return null; // field missing — skip check
  }

  try {
    const decoded = Buffer.from(t, "base64").toString("utf-8");
    const loadTime = parseInt(decoded, 10);

    if (isNaN(loadTime)) {
      return null; // malformed — skip
    }

    const elapsedMs = Date.now() - loadTime;
    const elapsedSeconds = elapsedMs / 1000;

    if (elapsedSeconds < minSubmitSeconds) {
      console.log(
        `[DBG][spam-protection] Timing check failed: ${elapsedSeconds.toFixed(1)}s < ${minSubmitSeconds}s`,
      );
      return { passed: false, reason: "too_fast" };
    }
  } catch {
    // decoding error — skip gracefully
    return null;
  }

  return null;
}
