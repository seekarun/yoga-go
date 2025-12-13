"use client";

/**
 * EventCandidates Component
 *
 * Displays a list of candidate events for disambiguation
 * when update/delete commands match multiple events.
 */

import { format, parseISO } from "date-fns";
import type { EventSummary } from "@/types";

interface EventCandidatesProps {
  events: EventSummary[];
  action: "update" | "delete";
  onSelect: (event: EventSummary) => void;
  onCancel: () => void;
}

export function EventCandidates({
  events,
  action,
  onSelect,
  onCancel,
}: EventCandidatesProps) {
  const actionText = action === "delete" ? "delete" : "update";
  const actionColor = action === "delete" ? "red" : "indigo";

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
      <p className="text-sm text-amber-800 mb-3">
        Multiple events match. Which one would you like to {actionText}?
      </p>

      <div className="space-y-2">
        {events.map((event) => (
          <button
            key={event.id}
            onClick={() => onSelect(event)}
            className={`w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-${actionColor}-300 hover:bg-${actionColor}-50 transition-colors`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{event.title}</p>
                <p className="text-sm text-gray-500">
                  {format(parseISO(event.date), "EEE, MMM d")} at{" "}
                  {event.startTime} - {event.endTime}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-gray-400"
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
        ))}
      </div>

      <button
        onClick={onCancel}
        className="mt-3 text-sm text-gray-500 hover:text-gray-700"
      >
        Cancel
      </button>
    </div>
  );
}
