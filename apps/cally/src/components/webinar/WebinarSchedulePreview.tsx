"use client";

import type { WebinarSchedule } from "@/types";
import { expandWebinarSessions } from "@/lib/webinar/schedule";

interface WebinarSchedulePreviewProps {
  schedule: WebinarSchedule;
  timezone: string;
}

export default function WebinarSchedulePreview({
  schedule,
  timezone,
}: WebinarSchedulePreviewProps) {
  const sessions = expandWebinarSessions(schedule, timezone);

  if (sessions.length === 0) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleTimeString("en-AU", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
        {sessions.length} session{sessions.length !== 1 ? "s" : ""}
      </p>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {sessions.map((session, i) => (
          <div
            key={session.date}
            className="flex items-center gap-2 text-xs text-[var(--text-main)] py-1 px-2 bg-gray-50 rounded"
          >
            <span className="font-medium text-[var(--text-muted)] w-5">
              {i + 1}.
            </span>
            <span>{formatDate(session.date)}</span>
            <span className="text-[var(--text-muted)]">
              {formatTime(session.startTime)} – {formatTime(session.endTime)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
