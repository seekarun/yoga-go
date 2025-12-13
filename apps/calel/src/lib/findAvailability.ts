/**
 * Find Availability Utility
 *
 * Calculates the next available time slot based on
 * availability rules and existing events.
 */

import { format, addDays, getDay, addMinutes, isBefore, parse } from "date-fns";

export interface AvailabilityRule {
  type: "weekly" | "date-specific";
  days?: number[]; // 0-6 for weekly (0 = Sunday)
  date?: string; // YYYY-MM-DD for date-specific
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  available: boolean;
}

export interface EventSlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface FoundSlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

/**
 * Find the next available time slot
 *
 * @param durationMinutes - Required duration in minutes
 * @param availabilityRules - User's availability rules
 * @param existingEvents - Events that block time
 * @param startFrom - Start searching from this time
 * @param maxDaysToSearch - Maximum days to search ahead (default: 14)
 * @returns The next available slot or null if none found
 */
export function findNextAvailableSlot(
  durationMinutes: number,
  availabilityRules: AvailabilityRule[],
  existingEvents: EventSlot[],
  startFrom: Date = new Date(),
  maxDaysToSearch: number = 14,
): FoundSlot | null {
  console.log(
    "[DBG][findAvailability] Searching for",
    durationMinutes,
    "minute slot",
  );

  // Get available rules only
  const availableRules = availabilityRules.filter((rule) => rule.available);

  if (availableRules.length === 0) {
    console.log("[DBG][findAvailability] No availability rules defined");
    return null;
  }

  // Search day by day
  for (let dayOffset = 0; dayOffset < maxDaysToSearch; dayOffset++) {
    const searchDate = addDays(startFrom, dayOffset);
    const dateStr = format(searchDate, "yyyy-MM-dd");
    const dayOfWeek = getDay(searchDate);

    // Get available time ranges for this day
    const dayRanges = getAvailableRanges(dateStr, dayOfWeek, availableRules);

    if (dayRanges.length === 0) {
      continue; // No availability on this day
    }

    // Get events for this day
    const dayEvents = existingEvents
      .filter((e) => e.date === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Find a gap in each available range
    for (const range of dayRanges) {
      const slot = findSlotInRange(
        range,
        dayEvents,
        durationMinutes,
        dateStr,
        startFrom,
        dayOffset === 0,
      );

      if (slot) {
        console.log(
          "[DBG][findAvailability] Found slot:",
          slot.date,
          slot.startTime,
        );
        return slot;
      }
    }
  }

  console.log(
    "[DBG][findAvailability] No slot found in",
    maxDaysToSearch,
    "days",
  );
  return null;
}

/**
 * Get available time ranges for a specific day
 */
function getAvailableRanges(
  dateStr: string,
  dayOfWeek: number,
  rules: AvailabilityRule[],
): Array<{ start: string; end: string }> {
  const ranges: Array<{ start: string; end: string }> = [];

  for (const rule of rules) {
    if (rule.type === "weekly" && rule.days?.includes(dayOfWeek)) {
      ranges.push({ start: rule.startTime, end: rule.endTime });
    } else if (rule.type === "date-specific" && rule.date === dateStr) {
      ranges.push({ start: rule.startTime, end: rule.endTime });
    }
  }

  // Merge overlapping ranges and sort
  return mergeRanges(ranges);
}

/**
 * Merge overlapping time ranges
 */
function mergeRanges(
  ranges: Array<{ start: string; end: string }>,
): Array<{ start: string; end: string }> {
  if (ranges.length === 0) return [];

  // Sort by start time
  const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));

  const merged: Array<{ start: string; end: string }> = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      // Overlapping or adjacent - merge
      last.end = current.end > last.end ? current.end : last.end;
    } else {
      // No overlap - add new range
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Find a slot within a specific available range
 */
function findSlotInRange(
  range: { start: string; end: string },
  events: EventSlot[],
  durationMinutes: number,
  dateStr: string,
  startFrom: Date,
  isToday: boolean,
): FoundSlot | null {
  let currentTime = range.start;

  // If searching today, start from current time if later than range start
  if (isToday) {
    const nowTime = format(startFrom, "HH:mm");
    if (nowTime > range.start) {
      // Round up to next 15-minute increment
      const [hour, minute] = nowTime.split(":").map(Number);
      const roundedMinute = Math.ceil(minute / 15) * 15;
      if (roundedMinute === 60) {
        currentTime = `${(hour + 1).toString().padStart(2, "0")}:00`;
      } else {
        currentTime = `${hour.toString().padStart(2, "0")}:${roundedMinute.toString().padStart(2, "0")}`;
      }
    }
  }

  // Filter events that overlap with this range
  const relevantEvents = events.filter(
    (e) => e.endTime > range.start && e.startTime < range.end,
  );

  // Try to find a gap
  for (const event of relevantEvents) {
    // Check if there's room before this event
    const slotEnd = addMinutesToTime(currentTime, durationMinutes);

    if (slotEnd <= event.startTime && slotEnd <= range.end) {
      // Found a slot before this event
      return {
        date: dateStr,
        startTime: currentTime,
        endTime: slotEnd,
      };
    }

    // Move current time to after this event
    if (event.endTime > currentTime) {
      currentTime = event.endTime;
    }
  }

  // Check if there's room after the last event
  const slotEnd = addMinutesToTime(currentTime, durationMinutes);
  if (currentTime < range.end && slotEnd <= range.end) {
    return {
      date: dateStr,
      startTime: currentTime,
      endTime: slotEnd,
    };
  }

  return null;
}

/**
 * Add minutes to a time string and return new time string
 */
function addMinutesToTime(time: string, minutes: number): string {
  const [hour, minute] = time.split(":").map(Number);
  const totalMinutes = hour * 60 + minute + minutes;
  const newHour = Math.floor(totalMinutes / 60);
  const newMinute = totalMinutes % 60;

  if (newHour >= 24) {
    return "23:59"; // Cap at end of day
  }

  return `${newHour.toString().padStart(2, "0")}:${newMinute.toString().padStart(2, "0")}`;
}

/**
 * Format a found slot for display
 */
export function formatFoundSlot(slot: FoundSlot): string {
  const date = parse(slot.date, "yyyy-MM-dd", new Date());
  const dateStr = format(date, "EEEE, MMMM d");
  return `${dateStr} at ${slot.startTime} - ${slot.endTime}`;
}
