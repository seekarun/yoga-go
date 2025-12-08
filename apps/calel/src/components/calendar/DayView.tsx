"use client";

/**
 * DayView Component
 *
 * Shows a day's schedule with 30-minute time slots.
 * Part of the calendar carousel system.
 */

import { format, setHours, setMinutes, isBefore, isAfter } from "date-fns";
import { usePreferences } from "@/contexts";
import type { CalendarEvent } from "./EventModal";

export type SlotStatus = "available" | "unavailable" | "busy";

export interface TimeSlot {
  time: string;
  status: SlotStatus;
  label?: string;
}

interface DayViewProps {
  date: Date;
  slots: TimeSlot[];
  events?: CalendarEvent[];
  onSlotClick?: (time: string) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const SLOT_HEIGHT = 44;
const PIXELS_PER_MINUTE = SLOT_HEIGHT / 30;

function generateTimeSlots(date: Date, existingSlots: TimeSlot[]): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const slotMap = new Map(existingSlots.map((s) => [s.time, s]));

  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      const existing = slotMap.get(time);
      slots.push({
        time,
        status: existing?.status || "unavailable",
        label: existing?.label,
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
  onSlotClick,
  onEventClick,
}: DayViewProps) {
  const { preferences } = usePreferences();
  const timeSlots = generateTimeSlots(date, slots);
  const dateStr = format(date, "yyyy-MM-dd");
  const dayEvents = events.filter((event) => event.date === dateStr);

  const getTagColor = (tagId?: string): string | undefined => {
    if (!tagId) return undefined;
    const tag = preferences.tags.find((t) => t.id === tagId);
    return tag?.color;
  };

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const getSlotStyle = (slot: TimeSlot) => {
    const [hour, minute] = slot.time.split(":").map(Number);
    const slotStart = setMinutes(setHours(date, hour), minute);
    const slotEnd = setMinutes(setHours(date, hour), minute + 30);
    const isCurrentSlot =
      isToday && isAfter(now, slotStart) && isBefore(now, slotEnd);

    const baseStyle = "transition-all duration-150 cursor-pointer";
    switch (slot.status) {
      case "busy":
        return `${baseStyle} bg-red-100 hover:bg-red-200 ${isCurrentSlot ? "ring-2 ring-red-500 ring-inset" : ""}`;
      default:
        return `${baseStyle} bg-white hover:bg-gray-50 ${isCurrentSlot ? "ring-2 ring-indigo-500 ring-inset" : ""}`;
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

  return (
    <div className="h-full overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex">
        {/* Time labels */}
        <div className="w-20 flex-shrink-0 border-r border-gray-200">
          {timeSlots.map((slot) => {
            const isHourStart = slot.time.endsWith(":00");
            return (
              <div
                key={slot.time}
                className="h-[44px] px-2 flex items-start justify-end relative bg-gray-50"
              >
                {isHourStart && (
                  <span className="text-xs -translate-y-1/2 px-1.5 py-0.5 rounded border border-gray-300 bg-white font-medium text-gray-700">
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
            return (
              <button
                key={slot.time}
                onClick={() => onSlotClick?.(slot.time)}
                className={`
                  h-[44px] w-full flex items-center justify-end pr-4 border-b
                  ${isHourStart ? "border-gray-100" : "border-gray-300"}
                  ${getSlotStyle(slot)}
                `}
              >
                {slot.status === "busy" && (
                  <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded">
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
                    borderLeft: tagColor ? `4px solid ${tagColor}` : undefined,
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
          </div>
        </div>
      </div>
    </div>
  );
}
