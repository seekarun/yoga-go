"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import type { BookingConfig, TimeSlot } from "@/types/booking";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  getTodayInTimezone,
  getMaxDate,
  getNextBusinessDay,
  formatDisplayDate,
} from "./dateUtils";

interface DayTimelineViewProps {
  bookingConfig: BookingConfig;
  slots: TimeSlot[];
  loading: boolean;
  selectedDate: string;
  timezone: string;
  onDateChange: (date: string) => void;
  onSlotSelect: (slot: TimeSlot) => void;
}

function formatTime(isoStr: string, tz: string): string {
  return new Date(isoStr).toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function DayTimelineView({
  bookingConfig,
  slots,
  loading,
  selectedDate,
  timezone,
  onDateChange,
  onSlotSelect,
}: DayTimelineViewProps) {
  const todayStr = getTodayInTimezone(bookingConfig.timezone);
  const maxDate = useMemo(
    () => getMaxDate(todayStr, bookingConfig.lookaheadDays),
    [todayStr, bookingConfig.lookaheadDays],
  );

  const canGoPrev = useMemo(
    () =>
      getNextBusinessDay(
        selectedDate,
        -1,
        bookingConfig.weeklySchedule,
        todayStr,
        maxDate,
      ) !== null,
    [selectedDate, bookingConfig.weeklySchedule, todayStr, maxDate],
  );

  const canGoNext = useMemo(
    () =>
      getNextBusinessDay(
        selectedDate,
        1,
        bookingConfig.weeklySchedule,
        todayStr,
        maxDate,
      ) !== null,
    [selectedDate, bookingConfig.weeklySchedule, todayStr, maxDate],
  );

  const handlePrev = () => {
    const prev = getNextBusinessDay(
      selectedDate,
      -1,
      bookingConfig.weeklySchedule,
      todayStr,
      maxDate,
    );
    if (prev) onDateChange(prev);
  };

  const handleNext = () => {
    const next = getNextBusinessDay(
      selectedDate,
      1,
      bookingConfig.weeklySchedule,
      todayStr,
      maxDate,
    );
    if (next) onDateChange(next);
  };

  const availableCount = slots.filter((s) => s.available).length;

  // Merge consecutive unavailable slots into single blocks
  type TimelineRow =
    | { type: "available"; slot: TimeSlot; durationMin: number }
    | {
        type: "booked";
        startTime: string;
        endTime: string;
        durationMin: number;
      };

  const slotDuration = bookingConfig.slotDurationMinutes;

  const timelineRows: TimelineRow[] = useMemo(() => {
    const rows: TimelineRow[] = [];
    let bookedBlock: { startTime: string; endTime: string } | null = null;

    for (const slot of slots) {
      if (!slot.available) {
        if (bookedBlock) {
          bookedBlock.endTime = slot.endTime;
        } else {
          bookedBlock = { startTime: slot.startTime, endTime: slot.endTime };
        }
      } else {
        if (bookedBlock) {
          const dur = durationMinutes(
            bookedBlock.startTime,
            bookedBlock.endTime,
          );
          rows.push({ type: "booked", ...bookedBlock, durationMin: dur });
          bookedBlock = null;
        }
        rows.push({
          type: "available",
          slot,
          durationMin: durationMinutes(slot.startTime, slot.endTime),
        });
      }
    }
    if (bookedBlock) {
      const dur = durationMinutes(bookedBlock.startTime, bookedBlock.endTime);
      rows.push({ type: "booked", ...bookedBlock, durationMin: dur });
    }
    return rows;
  }, [slots]);

  // Scroll shadow state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);

  const updateShadows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowTopShadow(el.scrollTop > 4);
    setShowBottomShadow(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);

  // Check shadows and auto-scroll to first available slot after slots load
  const scrollRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- assign to mutable ref
      (scrollRef as any).current = node;
      if (node) {
        requestAnimationFrame(() => {
          const firstAvailable = node.querySelector<HTMLElement>(
            "[data-slot-available]",
          );
          if (firstAvailable) {
            firstAvailable.scrollIntoView({ block: "start" });
          }
          updateShadows();
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run when slots change
    [updateShadows, slots],
  );

  // Row height: base height per single slot, booked blocks scale proportionally
  const BASE_ROW_H = 52; // px for one slot-duration row

  return (
    <div>
      {/* Date navigation bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canGoPrev}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous day"
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
          {formatDisplayDate(selectedDate)}
        </span>

        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next day"
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

      {/* Timeline body with scroll shadows */}
      <div className="relative">
        {/* Top scroll shadow */}
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-6 z-10 transition-opacity duration-200"
          style={{
            opacity: showTopShadow ? 1 : 0,
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0))",
          }}
        />
        {/* Bottom scroll shadow */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 z-10 transition-opacity duration-200"
          style={{
            opacity: showBottomShadow ? 1 : 0,
            background:
              "linear-gradient(to top, rgba(255,255,255,0.95), rgba(255,255,255,0))",
          }}
        />

        <div
          ref={scrollRefCallback}
          onScroll={updateShadows}
          className="timeline-scroll h-[420px] overflow-y-auto"
          style={{
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Hide webkit scrollbar */}
          <style>{`
            .timeline-scroll::-webkit-scrollbar { display: none; }
          `}</style>

          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <LoadingSpinner size="sm" />
                <p className="text-sm text-gray-500 mt-2">
                  Loading available times...
                </p>
              </div>
            </div>
          ) : slots.length === 0 || availableCount === 0 ? (
            <div
              className="flex items-center justify-center h-full rounded-lg bg-gray-50 border border-gray-100"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, transparent, transparent 8px, rgba(0,0,0,0.03) 8px, rgba(0,0,0,0.03) 9px)",
              }}
            >
              <p className="text-sm text-gray-400">
                No available times for this date.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 py-1">
              {timelineRows.map((row) => {
                const heightScale = row.durationMin / slotDuration;
                const rowHeight = Math.round(BASE_ROW_H * heightScale);

                if (row.type === "booked") {
                  const start = formatTime(row.startTime, timezone);
                  const end = formatTime(row.endTime, timezone);
                  return (
                    <div
                      key={row.startTime}
                      className="flex items-center px-4 rounded-lg bg-gray-50 border border-gray-100"
                      style={{
                        height: `${rowHeight}px`,
                        minHeight: `${BASE_ROW_H}px`,
                        backgroundImage:
                          "repeating-linear-gradient(135deg, transparent, transparent 8px, rgba(0,0,0,0.03) 8px, rgba(0,0,0,0.03) 9px)",
                      }}
                    >
                      <span className="text-sm text-gray-400">
                        {start} – {end}
                      </span>
                    </div>
                  );
                }

                const start = formatTime(row.slot.startTime, timezone);
                const end = formatTime(row.slot.endTime, timezone);
                return (
                  <div
                    key={row.slot.startTime}
                    data-slot-available
                    className="flex items-center justify-between px-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors"
                    style={{ height: `${BASE_ROW_H}px` }}
                  >
                    <span className="text-sm font-medium text-gray-700">
                      {start} – {end}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSlotSelect(row.slot)}
                      className="px-4 py-1.5 text-sm font-medium text-white rounded-md transition-colors"
                      style={{
                        backgroundColor: "var(--brand-500, #6366f1)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--brand-600, #4f46e5)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--brand-500, #6366f1)";
                      }}
                    >
                      Book Now
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Compute minutes between two ISO timestamps */
function durationMinutes(startIso: string, endIso: string): number {
  return Math.round(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000,
  );
}
