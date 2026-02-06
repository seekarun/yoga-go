/**
 * Booking Availability Logic
 * Pure functions for generating available time slots based on business hours and existing events
 */

import type { BookingConfig, TimeSlot } from "@/types/booking";
import type { CalendarEvent } from "@/types";

/**
 * Get the day-of-week (0-6, Sun-Sat) for a date string in a given timezone.
 * Uses Intl.DateTimeFormat for timezone conversion (no external library).
 */
function getDayOfWeekInTimezone(dateStr: string, timezone: string): number {
  // Parse date as noon UTC to avoid date boundary issues
  const date = new Date(`${dateStr}T12:00:00Z`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: timezone,
  });
  const weekday = formatter.format(date);
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return dayMap[weekday] ?? 0;
}

/**
 * Build an ISO timestamp for a given date and hour in a specific timezone.
 * Returns the UTC equivalent of `dateStr` at `hour:00` in the given timezone.
 */
function buildTimezoneTime(
  dateStr: string,
  hour: number,
  minute: number,
  timezone: string,
): Date {
  // Build a date string that represents the local time we want
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const localStr = `${dateStr}T${hh}:${mm}:00`;

  // Use Intl to figure out the UTC offset for this timezone at this date
  const tempDate = new Date(`${dateStr}T12:00:00Z`);
  const utcParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(tempDate);

  const tzParts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(tempDate);

  const getPartValue = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((p) => p.type === type)?.value ?? "0";

  const utcDate = new Date(
    `${getPartValue(utcParts, "year")}-${getPartValue(utcParts, "month")}-${getPartValue(utcParts, "day")}T${getPartValue(utcParts, "hour")}:${getPartValue(utcParts, "minute")}:${getPartValue(utcParts, "second")}Z`,
  );
  const tzDate = new Date(
    `${getPartValue(tzParts, "year")}-${getPartValue(tzParts, "month")}-${getPartValue(tzParts, "day")}T${getPartValue(tzParts, "hour")}:${getPartValue(tzParts, "minute")}:${getPartValue(tzParts, "second")}Z`,
  );

  // offset = tz - utc in ms
  const offsetMs = tzDate.getTime() - utcDate.getTime();

  // The local time we want, treated as UTC
  const asUTC = new Date(localStr + "Z");
  // Subtract the offset to get the real UTC time
  return new Date(asUTC.getTime() - offsetMs);
}

/**
 * Generate available time slots for a given date based on booking config and existing events.
 *
 * @param date - The date to generate slots for (YYYY-MM-DD)
 * @param config - Booking configuration with business hours and slot duration
 * @param existingEvents - Calendar events that may conflict with slots
 * @param now - Current time (for filtering past slots). Defaults to new Date().
 * @returns Array of TimeSlot objects with availability status
 */
export function generateAvailableSlots(
  date: string,
  config: BookingConfig,
  existingEvents: CalendarEvent[],
  now: Date = new Date(),
): TimeSlot[] {
  const { timezone, slotDurationMinutes, weeklySchedule } = config;

  // 1. Check if the day-of-week is enabled in business hours
  const dayOfWeek = getDayOfWeekInTimezone(date, timezone);
  const daySchedule = weeklySchedule[dayOfWeek];

  if (!daySchedule || !daySchedule.enabled) {
    return [];
  }

  const { startHour, endHour } = daySchedule;
  const slots: TimeSlot[] = [];

  // 2. Generate slot windows within business hours
  let currentMinute = startHour * 60;
  const endMinute = endHour * 60;

  while (currentMinute + slotDurationMinutes <= endMinute) {
    const slotHour = Math.floor(currentMinute / 60);
    const slotMin = currentMinute % 60;
    const slotEndMin = currentMinute + slotDurationMinutes;
    const slotEndHour = Math.floor(slotEndMin / 60);
    const slotEndMinute = slotEndMin % 60;

    const slotStart = buildTimezoneTime(date, slotHour, slotMin, timezone);
    const slotEnd = buildTimezoneTime(
      date,
      slotEndHour,
      slotEndMinute,
      timezone,
    );

    // 4. Exclude past slots (if date is today)
    if (slotStart.getTime() <= now.getTime()) {
      currentMinute += slotDurationMinutes;
      continue;
    }

    // 3. Check overlap with existing events
    const hasConflict = existingEvents.some((event) => {
      const eventStart = new Date(event.startTime).getTime();
      const eventEnd = new Date(event.endTime).getTime();
      const sStart = slotStart.getTime();
      const sEnd = slotEnd.getTime();
      // Overlap: slotStart < eventEnd && slotEnd > eventStart
      return sStart < eventEnd && sEnd > eventStart;
    });

    slots.push({
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      available: !hasConflict,
    });

    currentMinute += slotDurationMinutes;
  }

  return slots;
}
