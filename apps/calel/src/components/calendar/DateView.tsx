"use client";

/**
 * DateView Component
 *
 * Vertical scrollable list of dates with event summaries.
 * Part of the calendar carousel system.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import {
  format,
  addDays,
  subDays,
  isSameDay,
  isToday,
  startOfDay,
  differenceInDays,
} from "date-fns";
import { usePreferences } from "@/contexts";
import type { CalendarEvent } from "./EventModal";

interface DateViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  events?: CalendarEvent[];
}

const INITIAL_PAST_DAYS = 30;
const INITIAL_FUTURE_DAYS = 60;
const LOAD_MORE_DAYS = 30;
const SCROLL_THRESHOLD = 300;

export function DateView({
  selectedDate,
  onDateSelect,
  events = [],
}: DateViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const isInitialMount = useRef(true);
  const isAdjustingScroll = useRef(false);
  const { preferences } = usePreferences();

  const [dateRange, setDateRange] = useState(() => {
    const today = startOfDay(new Date());
    return {
      start: subDays(today, INITIAL_PAST_DAYS),
      end: addDays(today, INITIAL_FUTURE_DAYS),
    };
  });

  // Generate dates array
  const dates = (() => {
    const result: Date[] = [];
    let current = dateRange.start;
    while (current <= dateRange.end) {
      result.push(current);
      current = addDays(current, 1);
    }
    return result;
  })();

  const getEventsForDate = useCallback(
    (date: Date): CalendarEvent[] => {
      const dateStr = format(date, "yyyy-MM-dd");
      return events.filter((event) => event.date === dateStr);
    },
    [events],
  );

  const getEventSummary = useCallback(
    (date: Date): string => {
      const dayEvents = getEventsForDate(date);
      if (dayEvents.length === 0) return "";
      if (dayEvents.length === 1) return dayEvents[0].title;
      return `${dayEvents[0].title} +${dayEvents.length - 1} more`;
    },
    [getEventsForDate],
  );

  const loadMorePast = useCallback(() => {
    if (isAdjustingScroll.current) return;
    const container = containerRef.current;
    if (!container) return;

    const prevScrollHeight = container.scrollHeight;
    const prevScrollTop = container.scrollTop;
    isAdjustingScroll.current = true;

    setDateRange((prev) => ({
      ...prev,
      start: subDays(prev.start, LOAD_MORE_DAYS),
    }));

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop =
            prevScrollTop + (newScrollHeight - prevScrollHeight);
        }
        isAdjustingScroll.current = false;
      });
    });
  }, []);

  const loadMoreFuture = useCallback(() => {
    if (isAdjustingScroll.current) return;
    setDateRange((prev) => ({
      ...prev,
      end: addDays(prev.end, LOAD_MORE_DAYS),
    }));
  }, []);

  const handleScroll = useCallback(() => {
    if (isAdjustingScroll.current) return;
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    if (scrollTop < SCROLL_THRESHOLD) {
      loadMorePast();
    }
    if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD) {
      loadMoreFuture();
    }
  }, [loadMorePast, loadMoreFuture]);

  // Scroll to selected date on mount (use scrollTo to avoid affecting parent containers)
  useEffect(() => {
    if (!isInitialMount.current) return;
    const timer = setTimeout(() => {
      const container = containerRef.current;
      const selected = selectedRef.current;
      if (container && selected) {
        const scrollTop =
          selected.offsetTop -
          container.clientHeight / 2 +
          selected.offsetHeight / 2;
        container.scrollTo({ top: scrollTop, behavior: "instant" });
        isInitialMount.current = false;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [dates.length]);

  // Handle selected date change (use scrollTo to avoid affecting parent containers)
  useEffect(() => {
    if (isInitialMount.current) return;
    const selectedDay = startOfDay(selectedDate);

    if (selectedDay < dateRange.start) {
      setDateRange((prev) => ({ ...prev, start: subDays(selectedDay, 7) }));
    } else if (selectedDay > dateRange.end) {
      setDateRange((prev) => ({ ...prev, end: addDays(selectedDay, 7) }));
    }

    const timer = setTimeout(() => {
      const container = containerRef.current;
      const selected = selectedRef.current;
      if (container && selected) {
        const scrollTop =
          selected.offsetTop -
          container.clientHeight / 2 +
          selected.offsetHeight / 2;
        container.scrollTo({ top: scrollTop, behavior: "smooth" });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedDate, dateRange.start, dateRange.end]);

  const formatDateDisplay = (date: Date): string => {
    const dayName = format(date, "EEE");
    const dateStr = format(date, preferences.dateFormat);
    return `${dayName}, ${dateStr}`;
  };

  const getRelativeLabel = (date: Date): string | null => {
    const today = startOfDay(new Date());
    const diff = differenceInDays(date, today);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return null;
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {dates.map((date) => {
        const isSelected = isSameDay(date, selectedDate);
        const dateIsToday = isToday(date);
        const dayEvents = getEventsForDate(date);
        const eventSummary = getEventSummary(date);
        const relativeLabel = getRelativeLabel(date);

        return (
          <button
            key={date.toISOString()}
            ref={isSelected ? selectedRef : null}
            onClick={() => onDateSelect(date)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-100
              transition-all duration-150 text-left
              ${
                isSelected
                  ? "bg-indigo-600 text-white"
                  : dateIsToday
                    ? "bg-indigo-50 text-indigo-900 hover:bg-indigo-100"
                    : "bg-white text-gray-700 hover:bg-gray-50"
              }
            `}
          >
            <div className="flex-shrink-0 w-32">
              <div className="flex flex-col">
                <span
                  className={`text-sm font-medium ${
                    isSelected ? "text-white" : "text-gray-900"
                  }`}
                >
                  {formatDateDisplay(date)}
                </span>
                {relativeLabel && (
                  <span
                    className={`text-xs ${
                      isSelected
                        ? "text-indigo-200"
                        : dateIsToday
                          ? "text-indigo-600 font-medium"
                          : "text-gray-500"
                    }`}
                  >
                    {relativeLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {dayEvents.length > 0 ? (
                <div className="flex items-center gap-2">
                  <span
                    className={`flex-shrink-0 w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center ${
                      isSelected
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {dayEvents.length}
                  </span>
                  <span
                    className={`text-sm truncate ${
                      isSelected ? "text-indigo-100" : "text-gray-600"
                    }`}
                  >
                    {eventSummary}
                  </span>
                </div>
              ) : (
                <span
                  className={`text-sm ${
                    isSelected ? "text-indigo-300" : "text-gray-400"
                  }`}
                >
                  No events
                </span>
              )}
            </div>

            {/* Arrow indicator */}
            <svg
              className={`w-4 h-4 flex-shrink-0 ${
                isSelected ? "text-indigo-300" : "text-gray-400"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
