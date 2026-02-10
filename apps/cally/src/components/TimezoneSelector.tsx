"use client";

import { useState, useEffect } from "react";
import { SUPPORTED_TIMEZONES, getTimezoneLabel } from "@/lib/timezones";

interface TimezoneSelectorProps {
  value: string;
  onChange: (tz: string) => void;
}

export default function TimezoneSelector({
  value,
  onChange,
}: TimezoneSelectorProps) {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      try {
        const formatted = new Date().toLocaleTimeString("en-US", {
          timeZone: value,
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        setCurrentTime(formatted);
      } catch {
        setCurrentTime("");
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 30_000);
    return () => clearInterval(interval);
  }, [value]);

  const handleAutoDetect = () => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    onChange(browserTz);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="timezone-select"
          className="text-xs font-medium text-gray-500 uppercase tracking-wide"
        >
          Timezone
        </label>
        <button
          type="button"
          onClick={handleAutoDetect}
          className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Auto-detect
        </button>
      </div>
      <select
        id="timezone-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
      >
        {SUPPORTED_TIMEZONES.map((tz) => (
          <option key={tz} value={tz}>
            {getTimezoneLabel(tz)}
          </option>
        ))}
      </select>
      {currentTime && (
        <p className="text-xs text-gray-400">Current time: {currentTime}</p>
      )}
    </div>
  );
}
