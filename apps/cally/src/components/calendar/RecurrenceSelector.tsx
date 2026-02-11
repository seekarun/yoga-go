"use client";

import { useState, useEffect, useCallback } from "react";
import type { RecurrenceRule, RecurrenceFrequency, MonthlyMode } from "@/types";

interface RecurrenceSelectorProps {
  startDate: Date | null;
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_ABBREVS = ["S", "M", "T", "W", "T", "F", "S"];

const ORDINALS = ["first", "second", "third", "fourth", "fifth"];

function getOrdinal(n: number): string {
  return ORDINALS[n - 1] || `${n}th`;
}

function getWeekdayOrdinal(d: Date): number {
  return Math.ceil(d.getDate() / 7);
}

type PresetKey =
  | "none"
  | "daily"
  | "weekly"
  | "monthly_day"
  | "monthly_weekday"
  | "yearly"
  | "weekday"
  | "custom";

function buildPresets(
  startDate: Date,
): { key: PresetKey; label: string; rule: RecurrenceRule | null }[] {
  const dayName = DAY_NAMES[startDate.getDay()];
  const dayOfMonth = startDate.getDate();
  const nth = getWeekdayOrdinal(startDate);
  const ordinal = getOrdinal(nth);
  const monthName = startDate.toLocaleString("en-US", { month: "long" });

  return [
    { key: "none", label: "Does not repeat", rule: null },
    {
      key: "daily",
      label: "Daily",
      rule: { frequency: "daily", interval: 1, end: { afterOccurrences: 52 } },
    },
    {
      key: "weekly",
      label: `Weekly on ${dayName}`,
      rule: {
        frequency: "weekly",
        interval: 1,
        daysOfWeek: [startDate.getDay()],
        end: { afterOccurrences: 52 },
      },
    },
    {
      key: "monthly_day",
      label: `Monthly on day ${dayOfMonth}`,
      rule: {
        frequency: "monthly",
        interval: 1,
        monthlyMode: "dayOfMonth",
        end: { afterOccurrences: 12 },
      },
    },
    {
      key: "monthly_weekday",
      label: `Monthly on the ${ordinal} ${dayName}`,
      rule: {
        frequency: "monthly",
        interval: 1,
        monthlyMode: "dayOfWeek",
        end: { afterOccurrences: 12 },
      },
    },
    {
      key: "yearly",
      label: `Annually on ${monthName} ${dayOfMonth}`,
      rule: {
        frequency: "yearly",
        interval: 1,
        end: { afterOccurrences: 5 },
      },
    },
    {
      key: "weekday",
      label: "Every weekday (Mon\u2013Fri)",
      rule: {
        frequency: "weekday",
        interval: 1,
        end: { afterOccurrences: 52 },
      },
    },
    { key: "custom", label: "Custom...", rule: null },
  ];
}

export default function RecurrenceSelector({
  startDate,
  value,
  onChange,
}: RecurrenceSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("none");
  const [showCustom, setShowCustom] = useState(false);

  // Custom form state
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("weekly");
  const [interval, setInterval] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [monthlyMode, setMonthlyMode] = useState<MonthlyMode>("dayOfMonth");
  const [endType, setEndType] = useState<"afterOccurrences" | "onDate">(
    "afterOccurrences",
  );
  const [afterOccurrences, setAfterOccurrences] = useState(10);
  const [endDate, setEndDate] = useState("");

  // Reset when modal opens with new date
  useEffect(() => {
    if (startDate && !value) {
      setSelectedPreset("none");
      setShowCustom(false);
      setDaysOfWeek([startDate.getDay()]);
    }
  }, [startDate, value]);

  const buildCustomRule = useCallback((): RecurrenceRule => {
    const rule: RecurrenceRule = {
      frequency,
      interval: Math.max(1, interval),
      end:
        endType === "afterOccurrences"
          ? { afterOccurrences: Math.min(Math.max(1, afterOccurrences), 52) }
          : { onDate: endDate },
    };

    if (frequency === "weekly") {
      rule.daysOfWeek =
        daysOfWeek.length > 0 ? daysOfWeek : [startDate?.getDay() ?? 1];
    }

    if (frequency === "monthly") {
      rule.monthlyMode = monthlyMode;
    }

    return rule;
  }, [
    frequency,
    interval,
    endType,
    afterOccurrences,
    endDate,
    daysOfWeek,
    monthlyMode,
    startDate,
  ]);

  // Emit custom rule changes
  useEffect(() => {
    if (showCustom) {
      onChange(buildCustomRule());
    }
  }, [showCustom, buildCustomRule, onChange]);

  const handlePresetChange = (key: PresetKey) => {
    setSelectedPreset(key);

    if (key === "custom") {
      setShowCustom(true);
      // Initialize custom form from start date
      if (startDate) {
        setDaysOfWeek([startDate.getDay()]);
      }
      onChange(buildCustomRule());
      return;
    }

    setShowCustom(false);

    if (!startDate) {
      onChange(null);
      return;
    }

    const presets = buildPresets(startDate);
    const preset = presets.find((p) => p.key === key);
    onChange(preset?.rule ?? null);
  };

  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  if (!startDate) return null;

  const presets = buildPresets(startDate);
  const inputClasses =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] focus:border-transparent";

  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-700">
        Repeat
      </label>
      <select
        value={selectedPreset}
        onChange={(e) => handlePresetChange(e.target.value as PresetKey)}
        className={inputClasses}
      >
        {presets.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>

      {/* Custom recurrence form */}
      {showCustom && (
        <div className="mt-3 p-3 border border-gray-200 rounded-lg space-y-3 bg-gray-50">
          {/* Frequency + Interval */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Every</span>
            <input
              type="number"
              min={1}
              max={30}
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)]"
            />
            <select
              value={frequency}
              onChange={(e) =>
                setFrequency(e.target.value as RecurrenceFrequency)
              }
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)]"
            >
              <option value="daily">day(s)</option>
              <option value="weekly">week(s)</option>
              <option value="monthly">month(s)</option>
              <option value="yearly">year(s)</option>
            </select>
          </div>

          {/* Day-of-week checkboxes (weekly only) */}
          {frequency === "weekly" && (
            <div>
              <span className="text-sm text-gray-600 block mb-1">
                Repeat on
              </span>
              <div className="flex gap-1">
                {DAY_ABBREVS.map((abbrev, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDayOfWeek(i)}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                      daysOfWeek.includes(i)
                        ? "bg-[var(--color-primary,#6366f1)] text-white"
                        : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {abbrev}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly mode (monthly only) */}
          {frequency === "monthly" && startDate && (
            <div>
              <span className="text-sm text-gray-600 block mb-1">
                Repeat by
              </span>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="monthlyMode"
                    value="dayOfMonth"
                    checked={monthlyMode === "dayOfMonth"}
                    onChange={() => setMonthlyMode("dayOfMonth")}
                    className="text-[var(--color-primary,#6366f1)]"
                  />
                  Day {startDate.getDate()} of the month
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="monthlyMode"
                    value="dayOfWeek"
                    checked={monthlyMode === "dayOfWeek"}
                    onChange={() => setMonthlyMode("dayOfWeek")}
                    className="text-[var(--color-primary,#6366f1)]"
                  />
                  The {getOrdinal(getWeekdayOrdinal(startDate))}{" "}
                  {DAY_NAMES[startDate.getDay()]}
                </label>
              </div>
            </div>
          )}

          {/* End condition */}
          <div>
            <span className="text-sm text-gray-600 block mb-1">Ends</span>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="endType"
                  value="afterOccurrences"
                  checked={endType === "afterOccurrences"}
                  onChange={() => setEndType("afterOccurrences")}
                  className="text-[var(--color-primary,#6366f1)]"
                />
                After
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={afterOccurrences}
                  onChange={(e) =>
                    setAfterOccurrences(parseInt(e.target.value) || 1)
                  }
                  disabled={endType !== "afterOccurrences"}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] disabled:opacity-50"
                />
                occurrences
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="endType"
                  value="onDate"
                  checked={endType === "onDate"}
                  onChange={() => setEndType("onDate")}
                  className="text-[var(--color-primary,#6366f1)]"
                />
                On date
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={endType !== "onDate"}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] disabled:opacity-50"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
