/**
 * Webinar schedule utility
 *
 * Converts explicit WebinarSessionInput entries (local date + times)
 * into concrete ISO 8601 UTC timestamps for CalendarEvent creation.
 */

import type { WebinarSchedule } from "@/types/webinar";

/**
 * A single expanded webinar session with concrete UTC timestamps.
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
 * Convert a WebinarSchedule (explicit sessions with local times) into
 * an array of WebinarSession objects with ISO 8601 UTC timestamps.
 *
 * @param schedule - The webinar schedule with explicit sessions
 * @param timezone - IANA timezone string (e.g. "Australia/Sydney")
 * @returns Array of WebinarSession with ISO 8601 UTC timestamps
 */
export function expandWebinarSessions(
  schedule: WebinarSchedule,
  timezone: string,
): WebinarSession[] {
  return schedule.sessions.map((session) => ({
    date: session.date,
    startTime: localTimeToISO(session.date, session.startTime, timezone),
    endTime: localTimeToISO(session.date, session.endTime, timezone),
  }));
}
