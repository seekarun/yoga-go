"use client";

/**
 * QueryResults Component
 *
 * Displays calendar query results in the chat area.
 * Used for "what's on my calendar?" type queries.
 */

import type { EventSummary } from "@/types";

interface QueryResultsProps {
  events: EventSummary[];
  dateLabel: string; // e.g., "Tomorrow" or "December 15, 2024"
  onEventClick: (event: EventSummary) => void;
  onClose?: () => void;
}

export function QueryResults({
  events,
  dateLabel,
  onEventClick,
  onClose,
}: QueryResultsProps) {
  if (events.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            No events scheduled for {dateLabel}
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-indigo-800">
          {dateLabel} - {events.length} event{events.length !== 1 ? "s" : ""}
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="text-indigo-400 hover:text-indigo-600"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-1">
        {events.map((event) => (
          <button
            key={event.id}
            onClick={() => onEventClick(event)}
            className="w-full text-left px-3 py-2 bg-white border border-indigo-100 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-indigo-600 whitespace-nowrap">
                {event.startTime}
              </span>
              <span className="text-sm text-gray-900 truncate">
                {event.title}
              </span>
            </div>
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-indigo-600">
        Click an event to view details
      </p>
    </div>
  );
}
