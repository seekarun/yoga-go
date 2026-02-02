"use client";

import { useParams } from "next/navigation";

/**
 * Google Calendar integration page - placeholder
 */
export default function GoogleSettingsPage() {
  const params = useParams();
  const _expertId = params.expertId as string;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          Google Calendar
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Connect your Google Calendar to sync events.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[var(--color-border)] p-8 text-center">
        <svg
          className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V7.5h15v12z" />
        </svg>
        <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">
          Google Calendar Integration
        </h3>
        <p className="text-[var(--text-muted)] mb-6">
          Connect your Google Calendar to automatically create events and
          meetings.
        </p>
        <button className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors">
          Connect Google Calendar
        </button>
      </div>
    </div>
  );
}
