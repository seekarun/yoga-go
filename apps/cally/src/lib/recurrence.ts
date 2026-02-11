/**
 * Recurrence expansion utility — powered by rrule.js (RFC 5545)
 *
 * Translates our RecurrenceRule type into an RRule instance and
 * returns an array of YYYY-MM-DD date strings.
 */

import { RRule } from "rrule";
import type { RecurrenceRule } from "@/types";

const MAX_OCCURRENCES = 52;

/** Map our frequency strings to RRule frequency constants */
const FREQ_MAP: Record<string, number> = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
  // "weekday" is daily + byweekday filter (see below)
  weekday: RRule.DAILY,
};

/** Map JS day index (0=Sun) to RRule weekday objects */
const WEEKDAY_MAP = [
  RRule.SU,
  RRule.MO,
  RRule.TU,
  RRule.WE,
  RRule.TH,
  RRule.FR,
  RRule.SA,
];

/**
 * Format a Date to YYYY-MM-DD
 */
function toDateString(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Expand a recurrence rule into an array of YYYY-MM-DD date strings.
 *
 * @param startDateISO - Start date in ISO format (YYYY-MM-DD or full ISO)
 * @param rule - The recurrence rule
 * @returns Array of YYYY-MM-DD date strings (including the start date)
 */
export function expandRecurrence(
  startDateISO: string,
  rule: RecurrenceRule,
): string[] {
  const dateStr = startDateISO.substring(0, 10);
  const [year, month, day] = dateStr.split("-").map(Number);
  // rrule works in UTC — construct a UTC date at noon to avoid DST issues
  const dtstart = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const count = Math.min(
    rule.end.afterOccurrences ?? MAX_OCCURRENCES,
    MAX_OCCURRENCES,
  );

  const until = rule.end.onDate
    ? (() => {
        const [ey, em, ed] = rule.end.onDate.split("-").map(Number);
        return new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59));
      })()
    : undefined;

  // Build RRule options
  const freq = FREQ_MAP[rule.frequency] ?? RRule.WEEKLY;

  // Determine byweekday
  let byweekday: ReturnType<(typeof RRule.MO)["nth"]>[] | undefined;

  if (rule.frequency === "weekday") {
    // Mon–Fri
    byweekday = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR];
  } else if (rule.frequency === "weekly" && rule.daysOfWeek?.length) {
    byweekday = rule.daysOfWeek.map((d) => WEEKDAY_MAP[d]);
  } else if (rule.frequency === "monthly" && rule.monthlyMode === "dayOfWeek") {
    // e.g. "3rd Tuesday" — derive nth weekday from start date
    const jsDay = dtstart.getUTCDay();
    const nth = Math.ceil(dtstart.getUTCDate() / 7);
    byweekday = [WEEKDAY_MAP[jsDay].nth(nth)];
  }

  // For monthly dayOfMonth mode, rrule uses the dtstart day by default — no extra config needed.

  const rrule = new RRule({
    freq,
    interval: rule.frequency === "weekday" ? 1 : Math.max(1, rule.interval),
    dtstart,
    ...(until ? { until } : { count }),
    ...(byweekday ? { byweekday } : {}),
  });

  return rrule.all().map(toDateString);
}
