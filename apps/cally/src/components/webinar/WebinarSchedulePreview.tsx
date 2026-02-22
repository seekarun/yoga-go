"use client";

import type { WebinarSessionInput } from "@/types";

interface WebinarSchedulePreviewProps {
  sessions: WebinarSessionInput[];
}

export default function WebinarSchedulePreview({
  sessions,
}: WebinarSchedulePreviewProps) {
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

  const formatTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "pm" : "am";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  };

  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
        {sessions.length} session{sessions.length !== 1 ? "s" : ""}
      </p>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {sessions.map((session, i) => (
          <div
            key={`${session.date}-${i}`}
            className="flex items-center gap-2 text-xs text-[var(--text-main)] py-1 px-2 bg-gray-50 rounded"
          >
            <span className="font-medium text-[var(--text-muted)] w-5">
              {i + 1}.
            </span>
            <span>{formatDate(session.date)}</span>
            <span className="text-[var(--text-muted)]">
              {formatTime(session.startTime)} &ndash;{" "}
              {formatTime(session.endTime)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
