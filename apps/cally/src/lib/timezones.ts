/**
 * Shared timezone utilities for CallyGo
 * Single source of truth for supported IANA timezones
 */

/**
 * Available timezones for selection (common IANA timezones)
 */
export const SUPPORTED_TIMEZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Perth",
  "Australia/Adelaide",
  "Pacific/Auckland",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
] as const;

export type SupportedTimezone = (typeof SUPPORTED_TIMEZONES)[number];

/**
 * Get a human-readable label for a timezone
 * e.g. "Australia/Sydney" → "Australia/Sydney (AEDT)"
 */
export function getTimezoneLabel(tz: string): string {
  try {
    const short = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    return short ? `${tz} (${short})` : tz;
  } catch {
    return tz;
  }
}

/**
 * Validate that a string is a valid IANA timezone
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
