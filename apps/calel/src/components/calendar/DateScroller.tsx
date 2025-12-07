"use client";

/**
 * DateScroller Component
 *
 * Horizontal scrolling date picker similar to flight booking interfaces.
 * The selected date is centered and highlighted.
 */

import { useRef, useEffect, useCallback } from "react";
import {
  format,
  addDays,
  subDays,
  isSameDay,
  isToday,
  startOfDay,
} from "date-fns";

interface DateScrollerProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  daysToShow?: number;
}

export function DateScroller({
  selectedDate,
  onDateSelect,
  daysToShow = 14,
}: DateScrollerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Generate dates array centered around selected date
  const dates = Array.from({ length: daysToShow * 2 + 1 }, (_, i) =>
    addDays(startOfDay(selectedDate), i - daysToShow),
  );

  // Scroll to center the selected date
  const scrollToSelected = useCallback(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const element = selectedRef.current;
      const containerWidth = container.offsetWidth;
      const elementLeft = element.offsetLeft;
      const elementWidth = element.offsetWidth;

      container.scrollTo({
        left: elementLeft - containerWidth / 2 + elementWidth / 2,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    scrollToSelected();
  }, [selectedDate, scrollToSelected]);

  const handlePrevWeek = () => {
    onDateSelect(subDays(selectedDate, 7));
  };

  const handleNextWeek = () => {
    onDateSelect(addDays(selectedDate, 7));
  };

  const handleToday = () => {
    onDateSelect(new Date());
  };

  return (
    <div className="bg-white border-b">
      {/* Navigation buttons */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <button
          onClick={handlePrevWeek}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous week"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          onClick={handleToday}
          className="px-3 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          Today
        </button>

        <button
          onClick={handleNextWeek}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next week"
        >
          <svg
            className="w-5 h-5"
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
      </div>

      {/* Date scroller */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide py-4 px-2 gap-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {dates.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const dateIsToday = isToday(date);

          return (
            <button
              key={date.toISOString()}
              ref={isSelected ? selectedRef : null}
              onClick={() => onDateSelect(date)}
              className={`
                flex-shrink-0 flex flex-col items-center justify-center
                w-16 h-20 rounded-xl transition-all duration-200
                ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-lg scale-110 z-10"
                    : dateIsToday
                      ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                }
              `}
            >
              <span
                className={`text-xs font-medium uppercase ${isSelected ? "text-indigo-200" : "text-gray-500"}`}
              >
                {format(date, "EEE")}
              </span>
              <span className="text-2xl font-bold">{format(date, "d")}</span>
              <span
                className={`text-xs ${isSelected ? "text-indigo-200" : "text-gray-500"}`}
              >
                {format(date, "MMM")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected date display */}
      <div className="px-4 py-2 text-center border-t bg-gray-50">
        <span className="text-sm font-medium text-gray-900">
          {format(selectedDate, "EEEE, MMMM d, yyyy")}
        </span>
      </div>
    </div>
  );
}
