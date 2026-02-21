import type { WeeklySchedule, DateOverride } from "@/types/booking";

/**
 * Get YYYY-MM-DD string for a Date in a given timezone
 */
export function formatDateInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in the booking timezone
 */
export function getTodayInTimezone(timezone: string): string {
  return formatDateInTimezone(new Date(), timezone);
}

/**
 * Format a YYYY-MM-DD date string to "23 Nov 2026" display format
 */
export function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Get the next (or previous) business day from a date string.
 * Skips days where weeklySchedule[dow].enabled is false.
 * Bounded by todayStr (min) and maxDate (max).
 * Returns null if no valid day found within bounds.
 */
export function getNextBusinessDay(
  dateStr: string,
  direction: 1 | -1,
  weeklySchedule: WeeklySchedule,
  todayStr: string,
  maxDate: string,
  dateOverrides?: Record<string, DateOverride>,
): string | null {
  const d = new Date(dateStr + "T12:00:00Z");
  for (let i = 0; i < 60; i++) {
    d.setUTCDate(d.getUTCDate() + direction);
    const candidate = formatDateInTimezone(d, "UTC");

    if (candidate < todayStr || candidate > maxDate) return null;

    // Skip dates explicitly closed by override
    if (dateOverrides?.[candidate]?.enabled === false) continue;

    const dow = d.getUTCDay();
    if (weeklySchedule[dow]?.enabled) return candidate;
  }
  return null;
}

/**
 * Compute the max bookable date from today + lookaheadDays
 */
export function getMaxDate(todayStr: string, lookaheadDays: number): string {
  const d = new Date(todayStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + lookaheadDays);
  return formatDateInTimezone(d, "UTC");
}

/**
 * Find the first business day on or after the given date, within bounds
 */
export function findFirstBusinessDay(
  startDate: string,
  weeklySchedule: WeeklySchedule,
  todayStr: string,
  maxDate: string,
  dateOverrides?: Record<string, DateOverride>,
): string | null {
  const d = new Date(startDate + "T12:00:00Z");
  // Check the start date itself first
  if (startDate >= todayStr && startDate <= maxDate) {
    if (dateOverrides?.[startDate]?.enabled !== false) {
      const dow = d.getUTCDay();
      if (weeklySchedule[dow]?.enabled) return startDate;
    }
  }
  return getNextBusinessDay(
    startDate,
    1,
    weeklySchedule,
    todayStr,
    maxDate,
    dateOverrides,
  );
}
