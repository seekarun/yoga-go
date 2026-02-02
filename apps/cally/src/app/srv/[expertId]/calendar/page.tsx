"use client";

import { useParams } from "next/navigation";

/**
 * Calendar page - placeholder
 */
export default function CalendarPage() {
  const params = useParams();
  const _expertId = params.expertId as string;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Calendar</h1>
        <p className="text-[var(--text-muted)] mt-1">
          Manage your schedule and events.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[var(--color-border)] p-8 text-center">
        <svg
          className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">
          Calendar
        </h3>
        <p className="text-[var(--text-muted)]">
          The calendar is coming soon. For now, use the yoga app to manage your
          calendar.
        </p>
      </div>
    </div>
  );
}
