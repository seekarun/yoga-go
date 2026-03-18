/**
 * Date & Time Format Preferences
 * Centralised formatting helpers driven by tenant preferences.
 */

export type DateFormatOption =
  | "DD/MM/YYYY"
  | "MM/DD/YYYY"
  | "YYYY-MM-DD"
  | "DD MMM YYYY"
  | "MMM DD, YYYY";

export type TimeFormatOption = "12h" | "24h";

export const DATE_FORMAT_OPTIONS: {
  value: DateFormatOption;
  label: string;
  example: (d: Date) => string;
}[] = [
  {
    value: "DD/MM/YYYY",
    label: "DD/MM/YYYY",
    example: (d) => formatDateOnly(d, "DD/MM/YYYY"),
  },
  {
    value: "MM/DD/YYYY",
    label: "MM/DD/YYYY",
    example: (d) => formatDateOnly(d, "MM/DD/YYYY"),
  },
  {
    value: "YYYY-MM-DD",
    label: "YYYY-MM-DD",
    example: (d) => formatDateOnly(d, "YYYY-MM-DD"),
  },
  {
    value: "DD MMM YYYY",
    label: "DD MMM YYYY",
    example: (d) => formatDateOnly(d, "DD MMM YYYY"),
  },
  {
    value: "MMM DD, YYYY",
    label: "MMM DD, YYYY",
    example: (d) => formatDateOnly(d, "MMM DD, YYYY"),
  },
];

export const TIME_FORMAT_OPTIONS: {
  value: TimeFormatOption;
  label: string;
  example: (d: Date) => string;
}[] = [
  {
    value: "12h",
    label: "12-hour",
    example: (d) => formatTimeOnly(d, "12h"),
  },
  {
    value: "24h",
    label: "24-hour",
    example: (d) => formatTimeOnly(d, "24h"),
  },
];

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Format a Date to a date-only string using the given format.
 */
export function formatDateOnly(
  date: Date,
  fmt: DateFormatOption = "DD/MM/YYYY",
): string {
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const yyyy = String(date.getFullYear());
  const mon = MONTHS_SHORT[date.getMonth()];

  switch (fmt) {
    case "DD/MM/YYYY":
      return `${dd}/${mm}/${yyyy}`;
    case "MM/DD/YYYY":
      return `${mm}/${dd}/${yyyy}`;
    case "YYYY-MM-DD":
      return `${yyyy}-${mm}-${dd}`;
    case "DD MMM YYYY":
      return `${dd} ${mon} ${yyyy}`;
    case "MMM DD, YYYY":
      return `${mon} ${dd}, ${yyyy}`;
    default:
      return `${dd}/${mm}/${yyyy}`;
  }
}

/**
 * Format a Date to a time-only string using 12h or 24h format.
 */
export function formatTimeOnly(
  date: Date,
  fmt: TimeFormatOption = "12h",
): string {
  if (fmt === "24h") {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  const hours = date.getHours();
  const h = hours % 12 || 12;
  const ampm = hours < 12 ? "AM" : "PM";
  return `${h}:${pad(date.getMinutes())} ${ampm}`;
}

/**
 * Format an ISO string to a full date-time display string.
 * E.g. "Wed, 18 Mar 2026, 2:30 PM"
 */
export function formatDateTime(
  isoString: string,
  dateFmt: DateFormatOption = "DD/MM/YYYY",
  timeFmt: TimeFormatOption = "12h",
): string {
  const d = new Date(isoString);
  const weekday = WEEKDAYS_SHORT[d.getDay()];
  return `${weekday}, ${formatDateOnly(d, dateFmt)}, ${formatTimeOnly(d, timeFmt)}`;
}

export const DEFAULT_DATE_FORMAT: DateFormatOption = "DD/MM/YYYY";
export const DEFAULT_TIME_FORMAT: TimeFormatOption = "12h";

export const VALID_DATE_FORMATS: DateFormatOption[] = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  "DD MMM YYYY",
  "MMM DD, YYYY",
];

export const VALID_TIME_FORMATS: TimeFormatOption[] = ["12h", "24h"];
