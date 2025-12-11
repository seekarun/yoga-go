"use client";

/**
 * MonthView Component
 *
 * Displays a scrollable list of month calendars.
 * Each month shows a traditional calendar grid.
 * Clicking a date navigates to date view.
 */

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import type { CalendarEvent } from "./EventModal";

interface MonthViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  events?: CalendarEvent[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Generate calendar grid for a month
function getMonthGrid(date: Date): Date[][] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const weeks: Date[][] = [];
  let currentDate = calendarStart;

  while (currentDate <= calendarEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(currentDate);
      currentDate = addDays(currentDate, 1);
    }
    weeks.push(week);
  }

  return weeks;
}

// Single month calendar component
function MonthCalendar({
  month,
  selectedDate,
  onDateSelect,
  events,
}: {
  month: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  events: CalendarEvent[];
}) {
  const weeks = getMonthGrid(month);

  // Count events for a date
  const getEventCount = (date: Date): number => {
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter((e) => e.date === dateStr).length;
  };

  return (
    <div className="p-3">
      {/* Month header */}
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        {format(month, "MMMM yyyy")}
      </h3>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-xs font-medium text-gray-500 text-center py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((date, idx) => {
          const isCurrentMonth = isSameMonth(date, month);
          const isSelected = isSameDay(date, selectedDate);
          const dateIsToday = isToday(date);
          const eventCount = getEventCount(date);

          return (
            <button
              key={idx}
              onClick={() => onDateSelect(date)}
              className={`
                relative aspect-square flex flex-col items-center justify-center
                text-sm rounded-lg transition-all duration-150
                ${
                  isSelected
                    ? "bg-indigo-600 text-white"
                    : dateIsToday
                      ? "bg-indigo-100 text-indigo-900"
                      : isCurrentMonth
                        ? "text-gray-900 hover:bg-gray-100"
                        : "text-gray-400 hover:bg-gray-50"
                }
              `}
            >
              <span className={isSelected ? "font-semibold" : ""}>
                {format(date, "d")}
              </span>
              {eventCount > 0 && (
                <span
                  className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-indigo-300" : "bg-indigo-500"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MonthView({
  selectedDate,
  onDateSelect,
  events = [],
}: MonthViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Generate initial months starting from selectedDate (so it appears at top)
  // Past months will be loaded when user scrolls up
  const initialMonths = useMemo(() => {
    const selectedMonth = startOfMonth(selectedDate);
    const months: Date[] = [];
    // Start from 1 month before (for scroll buffer) and go 9 months forward
    for (let i = -1; i <= 9; i++) {
      months.push(startOfMonth(addMonths(selectedMonth, i)));
    }
    return months;
    // Only compute once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [monthsToShow, setMonthsToShow] = useState<Date[]>(initialMonths);

  // Load more months when scrolling
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    // Near bottom - add future months
    if (scrollHeight - scrollTop - clientHeight < 300) {
      setMonthsToShow((prev) => {
        const lastMonth = prev[prev.length - 1];
        const newMonths = [...prev];
        for (let i = 1; i <= 3; i++) {
          newMonths.push(startOfMonth(addMonths(lastMonth, i)));
        }
        return newMonths;
      });
    }

    // Near top - add past months
    if (scrollTop < 300) {
      const prevScrollHeight = scrollHeight;
      setMonthsToShow((prev) => {
        const firstMonth = prev[0];
        const newMonths: Date[] = [];
        for (let i = 3; i >= 1; i--) {
          newMonths.push(startOfMonth(subMonths(firstMonth, i)));
        }
        return [...newMonths, ...prev];
      });

      // Adjust scroll position
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop =
            scrollTop + (newScrollHeight - prevScrollHeight);
        }
      });
    }
  }, []);

  // Scroll to selected month when it changes
  useEffect(() => {
    const selectedMonth = startOfMonth(selectedDate);

    // Ensure selected month is in the list
    setMonthsToShow((prev) => {
      const hasMonth = prev.some((m) => isSameMonth(m, selectedMonth));
      if (hasMonth) return prev;

      // Add the selected month and surrounding months
      const newMonths: Date[] = [];
      for (let i = -3; i <= 6; i++) {
        newMonths.push(startOfMonth(addMonths(selectedMonth, i)));
      }
      return newMonths;
    });

    // Scroll to the selected month (use scrollTo to avoid affecting parent containers)
    // Use "instant" on initial mount, "smooth" on subsequent changes
    const timer = setTimeout(() => {
      const container = containerRef.current;
      const selectedMonthEl = container?.querySelector(
        '[data-selected-month="true"]',
      ) as HTMLElement | null;
      if (container && selectedMonthEl) {
        // For first month, scroll to top to show header
        // For other months, scroll so month header is at top with small buffer
        const scrollTop =
          selectedMonthEl.offsetTop === 0
            ? 0
            : Math.max(0, selectedMonthEl.offsetTop - 4);
        container.scrollTo({
          top: scrollTop,
          behavior: isInitialMount.current ? "instant" : "smooth",
        });
        isInitialMount.current = false;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedDate]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {monthsToShow.map((month) => {
        const isCurrentMonth = isSameMonth(month, new Date());
        const isSelectedMonth = isSameMonth(month, selectedDate);
        return (
          <div
            key={month.toISOString()}
            data-current-month={isCurrentMonth}
            data-selected-month={isSelectedMonth}
            className="border-b border-gray-200"
          >
            <MonthCalendar
              month={month}
              selectedDate={selectedDate}
              onDateSelect={onDateSelect}
              events={events}
            />
          </div>
        );
      })}
    </div>
  );
}
