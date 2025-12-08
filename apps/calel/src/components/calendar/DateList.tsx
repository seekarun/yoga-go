"use client";

/**
 * DateList Component
 *
 * Infinitely scrollable vertical date list with hidden scrollbar.
 * Each row has two columns: date (user preferred format) and event summary.
 * Smooth infinite scroll like Instagram feed.
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

interface DateListProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  events?: CalendarEvent[];
}

// Configuration
const INITIAL_PAST_DAYS = 30;
const INITIAL_FUTURE_DAYS = 60;
const LOAD_MORE_DAYS = 30;
const SCROLL_THRESHOLD = 300;

export function DateList({
  selectedDate,
  onDateSelect,
  events = [],
}: DateListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const isInitialMount = useRef(true);
  const isAdjustingScroll = useRef(false);
  const { preferences } = usePreferences();

  // Store the date range as start and end dates
  const [dateRange, setDateRange] = useState(() => {
    const today = startOfDay(new Date());
    return {
      start: subDays(today, INITIAL_PAST_DAYS),
      end: addDays(today, INITIAL_FUTURE_DAYS),
    };
  });

  // Generate dates array from range
  const dates = (() => {
    const result: Date[] = [];
    let current = dateRange.start;
    while (current <= dateRange.end) {
      result.push(current);
      current = addDays(current, 1);
    }
    return result;
  })();

  // Get events for a specific date
  const getEventsForDate = useCallback(
    (date: Date): CalendarEvent[] => {
      const dateStr = format(date, "yyyy-MM-dd");
      return events.filter((event) => event.date === dateStr);
    },
    [events],
  );

  // Generate event summary for a date
  const getEventSummary = useCallback(
    (date: Date): string => {
      const dayEvents = getEventsForDate(date);
      if (dayEvents.length === 0) return "";
      if (dayEvents.length === 1) return dayEvents[0].title;
      return `${dayEvents[0].title} +${dayEvents.length - 1} more`;
    },
    [getEventsForDate],
  );

  // Load more past dates
  const loadMorePast = useCallback(() => {
    if (isAdjustingScroll.current) return;

    const container = containerRef.current;
    if (!container) return;

    // Remember current scroll state
    const prevScrollHeight = container.scrollHeight;
    const prevScrollTop = container.scrollTop;

    isAdjustingScroll.current = true;

    setDateRange((prev) => ({
      ...prev,
      start: subDays(prev.start, LOAD_MORE_DAYS),
    }));

    // Adjust scroll position after render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          const heightDiff = newScrollHeight - prevScrollHeight;
          container.scrollTop = prevScrollTop + heightDiff;
        }
        isAdjustingScroll.current = false;
      });
    });
  }, []);

  // Load more future dates
  const loadMoreFuture = useCallback(() => {
    if (isAdjustingScroll.current) return;

    setDateRange((prev) => ({
      ...prev,
      end: addDays(prev.end, LOAD_MORE_DAYS),
    }));
  }, []);

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (isAdjustingScroll.current) return;

    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    // Near top - load past dates
    if (scrollTop < SCROLL_THRESHOLD) {
      loadMorePast();
    }

    // Near bottom - load future dates
    if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD) {
      loadMoreFuture();
    }
  }, [loadMorePast, loadMoreFuture]);

  // Scroll to selected date on initial mount
  useEffect(() => {
    if (!isInitialMount.current) return;

    const timer = setTimeout(() => {
      if (selectedRef.current) {
        selectedRef.current.scrollIntoView({
          behavior: "instant",
          block: "center",
        });
        isInitialMount.current = false;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [dates.length]);

  // Handle when selected date changes (e.g., clicking Today button)
  useEffect(() => {
    if (isInitialMount.current) return;

    const selectedDay = startOfDay(selectedDate);

    // If selected date is outside current range, expand range
    if (selectedDay < dateRange.start) {
      setDateRange((prev) => ({
        ...prev,
        start: subDays(selectedDay, 7),
      }));
    } else if (selectedDay > dateRange.end) {
      setDateRange((prev) => ({
        ...prev,
        end: addDays(selectedDay, 7),
      }));
    }

    // Scroll to selected date
    const timer = setTimeout(() => {
      if (selectedRef.current) {
        selectedRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedDate, dateRange.start, dateRange.end]);

  const handlePrevWeek = () => {
    onDateSelect(subDays(selectedDate, 7));
  };

  const handleNextWeek = () => {
    onDateSelect(addDays(selectedDate, 7));
  };

  const handleToday = () => {
    onDateSelect(new Date());
  };

  // Format date according to user preference
  const formatDateDisplay = (date: Date): string => {
    const dayName = format(date, "EEE");
    const dateStr = format(date, preferences.dateFormat);
    return `${dayName}, ${dateStr}`;
  };

  // Calculate relative date label
  const getRelativeLabel = (date: Date): string | null => {
    const today = startOfDay(new Date());
    const diff = differenceInDays(date, today);

    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return null;
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border-r border-gray-200">
      {/* Navigation header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <button
          onClick={handlePrevWeek}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          aria-label="Previous week"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>

        <button
          onClick={handleToday}
          className="px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
        >
          Today
        </button>

        <button
          onClick={handleNextWeek}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          aria-label="Next week"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Date list - hidden scrollbar, touch/wheel scroll */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-scroll overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{
          WebkitOverflowScrolling: "touch",
        }}
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
              {/* Date column */}
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

              {/* Event summary column */}
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
