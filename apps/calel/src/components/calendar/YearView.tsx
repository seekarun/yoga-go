"use client";

/**
 * YearView Component
 *
 * Displays a scrollable list of years.
 * Each year is shown as a single row.
 * Clicking a year navigates to the month view for that year.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import { getYear } from "date-fns";

interface YearViewProps {
  selectedYear: number;
  onYearSelect: (year: number) => void;
}

// Generate list of years
function generateYears(centerYear: number, range: number): number[] {
  const years: number[] = [];
  for (let i = centerYear - range; i <= centerYear + range; i++) {
    years.push(i);
  }
  return years;
}

export function YearView({ selectedYear, onYearSelect }: YearViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentYear = getYear(new Date());
  const [years, setYears] = useState<number[]>(() =>
    generateYears(currentYear, 10),
  );

  // Load more years when scrolling
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    // Near bottom - add future years
    if (scrollHeight - scrollTop - clientHeight < 100) {
      setYears((prev) => {
        const lastYear = prev[prev.length - 1];
        const newYears = [...prev];
        for (let i = 1; i <= 5; i++) {
          newYears.push(lastYear + i);
        }
        return newYears;
      });
    }

    // Near top - add past years
    if (scrollTop < 100) {
      const prevScrollHeight = scrollHeight;
      setYears((prev) => {
        const firstYear = prev[0];
        const newYears: number[] = [];
        for (let i = 5; i >= 1; i--) {
          newYears.push(firstYear - i);
        }
        return [...newYears, ...prev];
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

  // Scroll to current year on mount (use scrollTo to avoid affecting parent containers)
  useEffect(() => {
    const timer = setTimeout(() => {
      const container = containerRef.current;
      const currentYearEl = container?.querySelector(
        '[data-current-year="true"]',
      ) as HTMLElement | null;
      if (container && currentYearEl) {
        const scrollTop =
          currentYearEl.offsetTop -
          container.clientHeight / 2 +
          currentYearEl.offsetHeight / 2;
        container.scrollTo({ top: scrollTop, behavior: "instant" });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {years.map((year) => {
        const isSelected = year === selectedYear;
        const isCurrent = year === currentYear;

        return (
          <button
            key={year}
            data-current-year={isCurrent}
            onClick={() => onYearSelect(year)}
            className={`
              w-full px-4 py-3 text-left border-b border-gray-200
              transition-colors duration-150
              ${
                isSelected
                  ? "bg-indigo-600 text-white"
                  : isCurrent
                    ? "bg-indigo-50 text-indigo-900 hover:bg-indigo-100"
                    : "bg-white text-gray-900 hover:bg-gray-50"
              }
            `}
          >
            <span
              className={`text-lg font-medium ${isSelected ? "font-semibold" : ""}`}
            >
              {year}
            </span>
          </button>
        );
      })}
    </div>
  );
}
