"use client";

import { useState, useMemo } from "react";
import type { BookingConfig } from "@/types/booking";

interface DatePickerProps {
  bookingConfig: BookingConfig;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
}

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Get YYYY-MM-DD string for a Date in a given timezone
 */
function formatDateInTimezone(date: Date, timezone: string): string {
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
function getTodayInTimezone(timezone: string): string {
  return formatDateInTimezone(new Date(), timezone);
}

export default function DatePicker({
  bookingConfig,
  selectedDate,
  onDateSelect,
}: DatePickerProps) {
  const todayStr = getTodayInTimezone(bookingConfig.timezone);
  const [viewYear, setViewYear] = useState(() =>
    parseInt(todayStr.substring(0, 4), 10),
  );
  const [viewMonth, setViewMonth] = useState(
    () => parseInt(todayStr.substring(5, 7), 10) - 1,
  );

  const maxDate = useMemo(() => {
    const d = new Date(todayStr + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + bookingConfig.lookaheadDays);
    return formatDateInTimezone(d, "UTC");
  }, [todayStr, bookingConfig.lookaheadDays]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startDow = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: Array<{
      date: string;
      day: number;
      enabled: boolean;
      inMonth: boolean;
    }> = [];

    // Leading empty cells
    for (let i = 0; i < startDow; i++) {
      days.push({ date: "", day: 0, enabled: false, inMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(viewMonth + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      const dateStr = `${viewYear}-${mm}-${dd}`;

      // Check day-of-week in timezone
      const jsDate = new Date(`${dateStr}T12:00:00Z`);
      const dow = jsDate.getUTCDay();
      const daySchedule = bookingConfig.weeklySchedule[dow];
      const isBusinessDay = daySchedule?.enabled ?? false;

      // Check if in valid range
      const isPast = dateStr < todayStr;
      const isBeyondLookahead = dateStr > maxDate;

      days.push({
        date: dateStr,
        day: d,
        enabled: isBusinessDay && !isPast && !isBeyondLookahead,
        inMonth: true,
      });
    }

    return days;
  }, [viewYear, viewMonth, todayStr, maxDate, bookingConfig.weeklySchedule]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );

  const canGoPrev =
    viewYear > parseInt(todayStr.substring(0, 4), 10) ||
    (viewYear === parseInt(todayStr.substring(0, 4), 10) &&
      viewMonth > parseInt(todayStr.substring(5, 7), 10) - 1);

  const canGoNext = (() => {
    const maxYear = parseInt(maxDate.substring(0, 4), 10);
    const maxMonth = parseInt(maxDate.substring(5, 7), 10) - 1;
    return viewYear < maxYear || (viewYear === maxYear && viewMonth < maxMonth);
  })();

  const goToPrevMonth = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (!canGoNext) return;
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={goToPrevMonth}
          disabled={!canGoPrev}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={goToNextMonth}
          disabled={!canGoNext}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next month"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-medium text-gray-500 py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((cell, idx) => {
          if (!cell.inMonth) {
            return <div key={`empty-${idx}`} className="h-9" />;
          }

          const isSelected = cell.date === selectedDate;
          const isToday = cell.date === todayStr;

          return (
            <button
              key={cell.date}
              type="button"
              disabled={!cell.enabled}
              onClick={() => cell.enabled && onDateSelect(cell.date)}
              className={`
                h-9 rounded-md text-sm font-medium transition-colors
                ${
                  isSelected
                    ? "bg-indigo-600 text-white"
                    : cell.enabled
                      ? "hover:bg-indigo-50 text-gray-800"
                      : "text-gray-300 cursor-not-allowed"
                }
                ${isToday && !isSelected ? "ring-1 ring-indigo-400" : ""}
              `}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
