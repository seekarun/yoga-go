"use client";

/**
 * TimeGrid Component
 *
 * Displays a day view with 30-minute time slots in a single column.
 * Slots can be available (green), unavailable (gray), or busy (red).
 */

import { format, setHours, setMinutes, isBefore, isAfter } from "date-fns";

export type SlotStatus = "available" | "unavailable" | "busy";

export interface TimeSlot {
  time: string; // HH:mm format
  status: SlotStatus;
  label?: string;
}

interface TimeGridProps {
  date: Date;
  slots: TimeSlot[];
  onSlotClick?: (time: string) => void;
}

// Generate time slots for the full day (00:00 - 23:30)
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

export function TimeGrid({ date, slots, onSlotClick }: TimeGridProps) {
  const timeSlots = generateTimeSlots(date, slots);

  // Check if current time falls within a slot
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
      case "available":
        return `${baseStyle} bg-green-100 hover:bg-green-200 ${isCurrentSlot ? "ring-2 ring-green-500 ring-inset" : ""}`;
      case "busy":
        return `${baseStyle} bg-red-100 hover:bg-red-200 ${isCurrentSlot ? "ring-2 ring-red-500 ring-inset" : ""}`;
      case "unavailable":
      default:
        return `${baseStyle} bg-gray-50 hover:bg-gray-100 ${isCurrentSlot ? "ring-2 ring-indigo-500 ring-inset" : ""}`;
    }
  };

  const formatTimeLabel = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    const d = setMinutes(setHours(new Date(), hour), minute);
    return format(d, "h:mm a");
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Legend */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <span className="text-sm font-medium text-gray-700">
          Daily Schedule
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-200 border border-green-400" />
            <span className="text-xs text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-200 border border-gray-400" />
            <span className="text-xs text-gray-600">Unavailable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-200 border border-red-400" />
            <span className="text-xs text-gray-600">Busy</span>
          </div>
        </div>
      </div>

      {/* Time grid - single column */}
      <div className="overflow-y-auto max-h-[600px]">
        {timeSlots.map((slot, idx) => {
          const isHourStart = slot.time.endsWith(":00");
          const [hour] = slot.time.split(":").map(Number);

          return (
            <button
              key={slot.time}
              onClick={() => onSlotClick?.(slot.time)}
              className={`
                w-full flex items-center border-b last:border-b-0
                ${isHourStart ? "border-t border-gray-300" : "border-gray-100"}
                ${getSlotStyle(slot)}
              `}
            >
              {/* Time label */}
              <div
                className={`
                w-24 flex-shrink-0 py-2 px-3 text-right border-r border-gray-200
                ${isHourStart ? "bg-gray-100" : "bg-gray-50"}
              `}
              >
                <span
                  className={`text-sm ${isHourStart ? "font-semibold text-gray-800" : "text-gray-500"}`}
                >
                  {formatTimeLabel(slot.time)}
                </span>
              </div>

              {/* Slot content */}
              <div className="flex-1 py-2 px-4 flex items-center justify-between min-h-[44px]">
                <div className="flex items-center gap-2">
                  {slot.status === "available" && (
                    <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">
                      Available
                    </span>
                  )}
                  {slot.status === "busy" && (
                    <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded">
                      Busy
                    </span>
                  )}
                  {slot.label && (
                    <span className="text-sm text-gray-700">{slot.label}</span>
                  )}
                </div>

                {/* Hover indicator */}
                <svg
                  className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
