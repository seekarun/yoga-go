"use client";

/**
 * DayView Component
 *
 * Shows a day's schedule with 30-minute time slots.
 * Supports infinite scrolling across days.
 * Part of the calendar carousel system.
 */

import { useRef, useEffect, useCallback } from "react";
import { format, setHours, setMinutes, addDays } from "date-fns";
import { usePreferences } from "@/contexts";
import type { CalendarEvent } from "./EventModal";

export type SlotStatus = "available" | "unavailable" | "busy";

export interface TimeSlot {
  time: string;
  status: SlotStatus;
  label?: string;
}

// Preview event for showing a dotted outline while creating
export interface PreviewEvent {
  title?: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

interface DayViewProps {
  date: Date;
  slots: TimeSlot[];
  events?: CalendarEvent[];
  previewEvent?: PreviewEvent | null; // Shows dotted preview while creating
  scrollToTime?: string; // HH:mm - scroll to this time when set
  onSlotClick?: (time: string, date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onDateChange?: (date: Date) => void; // Called when scrolling changes the visible day
}

const SLOT_HEIGHT = 44;
const PIXELS_PER_MINUTE = SLOT_HEIGHT / 30;
const DAY_HEIGHT = SLOT_HEIGHT * 48; // 48 slots per day (24 hours × 2)
const DAYS_TO_RENDER = 5; // Render 5 days: 2 before, current, 2 after

function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      slots.push({
        time,
        status: "unavailable",
      });
    }
  }
  return slots;
}

function getEventStyle(event: CalendarEvent): React.CSSProperties {
  const [startHour, startMin] = event.startTime.split(":").map(Number);
  const [endHour, endMin] = event.endTime.split(":").map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const durationMinutes = endMinutes - startMinutes;

  return {
    top: `${startMinutes * PIXELS_PER_MINUTE}px`,
    height: `${Math.max(durationMinutes * PIXELS_PER_MINUTE, 22)}px`,
  };
}

export function DayView({
  date,
  slots,
  events = [],
  previewEvent,
  scrollToTime,
  onSlotClick,
  onEventClick,
  onDateChange,
}: DayViewProps) {
  const { preferences } = usePreferences();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isInitialScrollDone = useRef(false);
  const lastReportedDate = useRef<string>(format(date, "yyyy-MM-dd"));

  const timeSlots = generateTimeSlots();
  const now = new Date();

  // Generate array of days to render
  const daysToRender: Date[] = [];
  const startOffset = -Math.floor(DAYS_TO_RENDER / 2);
  for (let i = 0; i < DAYS_TO_RENDER; i++) {
    daysToRender.push(addDays(date, startOffset + i));
  }

  const getTagColor = (tagId?: string): string | undefined => {
    if (!tagId) return undefined;
    const tag = preferences.tags.find((t) => t.id === tagId);
    return tag?.color;
  };

  const getSlotStyle = (slot: TimeSlot) => {
    const baseStyle = "transition-all duration-150 cursor-pointer";
    switch (slot.status) {
      case "busy":
        return `${baseStyle} bg-red-100 hover:bg-red-200`;
      default:
        return `${baseStyle} bg-white hover:bg-gray-50`;
    }
  };

  const formatTimeLabel = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    const d = setMinutes(setHours(new Date(), hour), minute);
    return format(d, preferences.timeFormat === "24h" ? "HH:mm" : "h:mm a");
  };

  const formatEventTime = (startTime: string, endTime: string) => {
    const formatTime = (time: string) => {
      const [hour, minute] = time.split(":").map(Number);
      const d = setMinutes(setHours(new Date(), hour), minute);
      return format(d, preferences.timeFormat === "24h" ? "HH:mm" : "h:mm a");
    };
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  // Calculate current time line position for a specific day
  const getCurrentTimePosition = (dayDate: Date): number | null => {
    const isToday = dayDate.toDateString() === now.toDateString();
    if (!isToday) return null;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes * PIXELS_PER_MINUTE;
  };

  // Handle scroll to detect day changes
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !onDateChange) return;

    const scrollTop = scrollContainerRef.current.scrollTop;
    const containerHeight = scrollContainerRef.current.clientHeight;

    // Find which day is most visible (center of viewport)
    const viewportCenter = scrollTop + containerHeight / 2;
    const dayIndex = Math.floor(viewportCenter / DAY_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(dayIndex, DAYS_TO_RENDER - 1));

    const visibleDate = daysToRender[clampedIndex];
    const visibleDateStr = format(visibleDate, "yyyy-MM-dd");

    // Only report if date changed
    if (visibleDateStr !== lastReportedDate.current) {
      lastReportedDate.current = visibleDateStr;
      onDateChange(visibleDate);
    }
  }, [daysToRender, onDateChange]);

  // Initial scroll to position current day in view
  useEffect(() => {
    if (!scrollContainerRef.current || isInitialScrollDone.current) return;

    // Scroll to center day (current date) + current time or specified time
    const centerDayOffset = Math.floor(DAYS_TO_RENDER / 2) * DAY_HEIGHT;

    let timeOffset = 0;
    if (scrollToTime) {
      const [hour, minute] = scrollToTime.split(":").map(Number);
      const slotIndex = hour * 2 + (minute >= 30 ? 1 : 0);
      timeOffset = Math.max(0, (slotIndex - 2) * SLOT_HEIGHT);
    } else {
      // Default to current time or 8am
      const hours = now.getHours();
      const slotIndex = Math.max(0, hours * 2 - 2);
      timeOffset = slotIndex * SLOT_HEIGHT;
    }

    scrollContainerRef.current.scrollTop = centerDayOffset + timeOffset;
    isInitialScrollDone.current = true;
  }, [scrollToTime]);

  // Reset initial scroll flag when date changes significantly
  useEffect(() => {
    const currentDateStr = format(date, "yyyy-MM-dd");
    if (
      Math.abs(date.getTime() - new Date(lastReportedDate.current).getTime()) >
      2 * 24 * 60 * 60 * 1000
    ) {
      isInitialScrollDone.current = false;
      lastReportedDate.current = currentDateStr;
    }
  }, [date]);

  // Render a single day section
  const renderDay = (dayDate: Date) => {
    const dateStr = format(dayDate, "yyyy-MM-dd");
    const dayEvents = events.filter((event) => event.date === dateStr);
    const currentTimePos = getCurrentTimePosition(dayDate);
    const isToday = dayDate.toDateString() === now.toDateString();
    const showPreview = previewEvent && format(date, "yyyy-MM-dd") === dateStr;

    return (
      <div key={dateStr} className="relative" style={{ height: DAY_HEIGHT }}>
        <div className="flex h-full">
          {/* Time labels */}
          <div className="w-20 flex-shrink-0 border-r border-gray-200">
            {timeSlots.map((slot) => {
              const isHourStart = slot.time.endsWith(":00");
              return (
                <div
                  key={`${dateStr}-label-${slot.time}`}
                  className="h-[44px] px-2 flex items-start justify-end relative bg-gray-50"
                >
                  {isHourStart && (
                    <span className="text-xs -translate-y-1/2 px-1.5 py-0.5 rounded border border-gray-300 bg-white font-medium text-gray-700 z-10">
                      {formatTimeLabel(slot.time)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time slots with events */}
          <div className="flex-1 relative">
            {timeSlots.map((slot) => {
              const isHourStart = slot.time.endsWith(":00");
              const isFirstSlot = slot.time === "00:00";
              const isMidnightLine = slot.time === "23:30"; // Line after this marks midnight
              return (
                <button
                  key={`${dateStr}-slot-${slot.time}`}
                  onClick={() => onSlotClick?.(slot.time, dayDate)}
                  className={`
                    h-[44px] w-full flex items-start px-3 border-b relative
                    ${isMidnightLine ? "border-gray-800" : isHourStart ? "border-gray-100" : "border-gray-300"}
                    ${getSlotStyle(slot)}
                  `}
                >
                  {/* Day label in first slot */}
                  {isFirstSlot && (
                    <span className="text-sm font-medium text-gray-500 pt-1">
                      {format(dayDate, "EEEE, MMMM d")}
                      {isToday && (
                        <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                          Today
                        </span>
                      )}
                    </span>
                  )}
                  {slot.status === "busy" && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded">
                      Busy
                    </span>
                  )}
                </button>
              );
            })}

            {/* Events overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {dayEvents.map((event) => {
                const tagColor = getTagColor(event.tagId);
                return (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    className="absolute left-1 right-1 bg-stone-100 rounded-md shadow-sm border border-stone-200
                      overflow-hidden cursor-pointer pointer-events-auto
                      hover:bg-stone-200 transition-colors"
                    style={{
                      ...getEventStyle(event),
                      borderLeft: tagColor
                        ? `4px solid ${tagColor}`
                        : undefined,
                    }}
                  >
                    <div className="px-2 py-1 h-full">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {formatEventTime(event.startTime, event.endTime)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Preview event (dotted outline while creating) */}
              {showPreview &&
                previewEvent.startTime &&
                previewEvent.endTime && (
                  <div
                    className="absolute left-1 right-1 rounded-md border-2 border-dashed border-indigo-400 bg-indigo-50/50"
                    style={getEventStyle({
                      ...previewEvent,
                      id: "preview",
                      date: dateStr,
                      description: "",
                    } as CalendarEvent)}
                  >
                    <div className="px-2 py-1 h-full">
                      <p className="text-xs font-medium text-gray-400 truncate">
                        {previewEvent.title || "New Event"}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {formatEventTime(
                          previewEvent.startTime,
                          previewEvent.endTime,
                        )}
                      </p>
                    </div>
                  </div>
                )}

              {/* Current time line indicator */}
              {currentTimePos !== null && (
                <div
                  className="absolute left-0 right-0 flex items-center pointer-events-none z-10"
                  style={{ top: `${currentTimePos}px` }}
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                  <div className="flex-1 h-0.5 bg-red-500" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      {daysToRender.map((dayDate) => renderDay(dayDate))}
    </div>
  );
}
