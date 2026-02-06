"use client";

import type { TimeSlot } from "@/types/booking";
import LoadingSpinner from "@/components/LoadingSpinner";

interface TimeSlotGridProps {
  slots: TimeSlot[];
  loading: boolean;
  selectedSlot: TimeSlot | null;
  onSlotSelect: (slot: TimeSlot) => void;
  timezone: string;
}

/**
 * Format an ISO time to a short local time string in the given timezone.
 * e.g. "9:00 AM"
 */
function formatTime(isoStr: string, timezone: string): string {
  const date = new Date(isoStr);
  return date.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function TimeSlotGrid({
  slots,
  loading,
  selectedSlot,
  onSlotSelect,
  timezone,
}: TimeSlotGridProps) {
  if (loading) {
    return (
      <div className="py-8">
        <LoadingSpinner size="sm" />
        <p className="text-center text-sm text-gray-500 mt-2">
          Loading available times...
        </p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-500">
          No available slots for this date.
        </p>
      </div>
    );
  }

  const availableSlots = slots.filter((s) => s.available);
  if (availableSlots.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-500">
          All slots are booked for this date.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
      {slots.map((slot) => {
        const isSelected =
          selectedSlot?.startTime === slot.startTime &&
          selectedSlot?.endTime === slot.endTime;

        return (
          <button
            key={slot.startTime}
            type="button"
            disabled={!slot.available}
            onClick={() => slot.available && onSlotSelect(slot)}
            className={`
              px-2 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                isSelected
                  ? "bg-indigo-600 text-white"
                  : slot.available
                    ? "bg-gray-50 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border border-gray-200"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed line-through"
              }
            `}
          >
            {formatTime(slot.startTime, timezone)}
          </button>
        );
      })}
    </div>
  );
}
