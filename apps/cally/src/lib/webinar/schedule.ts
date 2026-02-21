/**
 * Webinar schedule expansion utility
 *
 * Pure functions to expand a WebinarSchedule + RecurrenceRule into
 * concrete session date/time pairs (ISO 8601 timestamps).
 */

import type { WebinarSchedule } from "@/types/webinar";

import { expandRecurrence } from "@/lib/recurrence";

/**
 * A single expanded webinar session with concrete timestamps.
 */
export interface WebinarSession {
  /** Session date in YYYY-MM-DD format */
  date: string;
  /** ISO 8601 UTC timestamp for session start */
  startTime: string;
  /** ISO 8601 UTC timestamp for session end */
  endTime: string;
}

/**
 * Convert a local date + time (HH:mm) in a specific timezone to an
 * ISO 8601 UTC timestamp string.
 *
 * Uses Intl.DateTimeFormat to compute the timezone offset — same approach
 * used in booking/availability.ts.
 */
function localTimeToISO(
  dateStr: string,
  time: string,
  timezone: string,
): string {
  const [hour, minute] = time.split(":").map(Number);
  const localStr = `${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

  // Use a reference point on the target date to determine the UTC offset
  const refDate = new Date(`${dateStr}T12:00:00Z`);

  const getPartValue = (
    parts: Intl.DateTimeFormatPart[],
    type: string,
  ): string => parts.find((p) => p.type === type)?.value ?? "0";

  const formatOpts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  const utcParts = new Intl.DateTimeFormat("en-US", {
    ...formatOpts,
    timeZone: "UTC",
  }).formatToParts(refDate);

  const tzParts = new Intl.DateTimeFormat("en-US", {
    ...formatOpts,
    timeZone: timezone,
  }).formatToParts(refDate);

  const utcDate = new Date(
    `${getPartValue(utcParts, "year")}-${getPartValue(utcParts, "month")}-${getPartValue(utcParts, "day")}T${getPartValue(utcParts, "hour")}:${getPartValue(utcParts, "minute")}:${getPartValue(utcParts, "second")}Z`,
  );
  const tzDate = new Date(
    `${getPartValue(tzParts, "year")}-${getPartValue(tzParts, "month")}-${getPartValue(tzParts, "day")}T${getPartValue(tzParts, "hour")}:${getPartValue(tzParts, "minute")}:${getPartValue(tzParts, "second")}Z`,
  );

  // offset = tz - utc in ms
  const offsetMs = tzDate.getTime() - utcDate.getTime();

  // Treat local time as UTC, then subtract the offset to get real UTC
  const asUTC = new Date(localStr + "Z");
  return new Date(asUTC.getTime() - offsetMs).toISOString();
}

/**
 * Expand a WebinarSchedule into an array of concrete WebinarSession objects.
 *
 * - If no recurrenceRule, returns a single session for startDate.
 * - If recurrenceRule exists, delegates to expandRecurrence (rrule-based)
 *   to generate all session dates, then converts each to ISO timestamps.
 *
 * @param schedule - The webinar schedule configuration
 * @param timezone - IANA timezone string (e.g. "Australia/Sydney")
 * @returns Array of WebinarSession with ISO 8601 UTC timestamps
 */
export function expandWebinarSessions(
  schedule: WebinarSchedule,
  timezone: string,
): WebinarSession[] {
  const { startDate, startTime, endTime, recurrenceRule } = schedule;

  // Determine all session dates
  const dates: string[] = recurrenceRule
    ? expandRecurrence(startDate, recurrenceRule)
    : [startDate];

  // Convert each date to a full session with ISO timestamps
  return dates.map((date) => ({
    date,
    startTime: localTimeToISO(date, startTime, timezone),
    endTime: localTimeToISO(date, endTime, timezone),
  }));
}

/**
 * Convenience function returning the total number of sessions
 * for a given webinar schedule.
 *
 * @param schedule - The webinar schedule configuration
 * @param timezone - IANA timezone string (e.g. "Australia/Sydney")
 * @returns Number of sessions
 */
export function computeSessionCount(
  schedule: WebinarSchedule,
  timezone: string,
): number {
  return expandWebinarSessions(schedule, timezone).length;
}
