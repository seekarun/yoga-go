"use client";

/**
 * EventView Component
 *
 * Shows event details or event creation form.
 * Part of the calendar carousel system.
 */

import { useState, useEffect } from "react";
import { format, setHours, setMinutes } from "date-fns";
import { usePreferences } from "@/contexts";
import type { CalendarEvent } from "./EventModal";
import type { EventPrefill } from "@/types";

// Form data for preview
export interface EventFormData {
  title: string;
  startTime: string;
  endTime: string;
}

interface EventViewProps {
  date: Date;
  initialTime?: string;
  event?: CalendarEvent | null;
  prefillData?: EventPrefill | null; // Pre-filled data from NL parsing
  onSave?: (event: Omit<CalendarEvent, "id">) => void;
  onDelete?: (eventId: string) => void;
  onChange?: (data: EventFormData) => void; // Report form changes for preview
}

function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 15, 30, 45]) {
      options.push(
        `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
      );
    }
  }
  return options;
}

export function EventView({
  date,
  initialTime = "09:00",
  event,
  prefillData,
  onSave,
  onDelete,
  onChange,
}: EventViewProps) {
  const { preferences } = usePreferences();
  const timeOptions = generateTimeOptions();

  // Priority: prefillData > event > defaults
  const [title, setTitle] = useState(prefillData?.title || event?.title || "");
  const [description, setDescription] = useState(
    prefillData?.description || event?.description || "",
  );
  const [startTime, setStartTime] = useState(
    prefillData?.startTime || event?.startTime || initialTime,
  );
  const [endTime, setEndTime] = useState(
    prefillData?.endTime || event?.endTime || "",
  );
  const [selectedTag, setSelectedTag] = useState(event?.tagId || "");

  // Track if user has explicitly entered values (vs just defaults)
  // Preview only shows when there's explicit input or prefillData
  const [hasExplicitInput, setHasExplicitInput] = useState(
    !!(prefillData?.startTime || prefillData?.endTime),
  );

  // Update form when prefillData changes (e.g., new NL command)
  useEffect(() => {
    if (prefillData) {
      if (prefillData.title) setTitle(prefillData.title);
      if (prefillData.description) setDescription(prefillData.description);
      if (prefillData.startTime) setStartTime(prefillData.startTime);
      if (prefillData.endTime) setEndTime(prefillData.endTime);
      // Mark as explicit input when prefillData is provided
      if (prefillData.startTime || prefillData.endTime) {
        setHasExplicitInput(true);
      }
    }
  }, [prefillData]);

  // Calculate default end time (1 hour after start)
  useEffect(() => {
    if (!event && startTime && !endTime) {
      const [hour, minute] = startTime.split(":").map(Number);
      const endHour = Math.min(hour + 1, 23);
      setEndTime(
        `${endHour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
      );
    }
  }, [startTime, event, endTime]);

  // Report form changes for preview (only when user has explicitly entered values)
  useEffect(() => {
    if (onChange && startTime && endTime && hasExplicitInput) {
      onChange({ title, startTime, endTime });
    }
  }, [title, startTime, endTime, onChange, hasExplicitInput]);

  const formatTimeLabel = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    const d = setMinutes(setHours(new Date(), hour), minute);
    return format(d, preferences.timeFormat === "24h" ? "HH:mm" : "h:mm a");
  };

  const handleSave = () => {
    if (!title.trim() || !startTime || !endTime) return;

    onSave?.({
      title: title.trim(),
      description: description.trim(),
      date: format(date, "yyyy-MM-dd"),
      startTime,
      endTime,
      tagId: selectedTag || undefined,
    });
  };

  const handleDelete = () => {
    if (event?.id) {
      onDelete?.(event.id);
    }
  };

  const isEditing = !!event;

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-4">
        {/* Date display */}
        <div className="text-center pb-4 border-b border-gray-200">
          <p className="text-sm text-gray-500">
            {format(date, "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setHasExplicitInput(true);
            }}
            placeholder="What's happening?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>

        {/* Time selection */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <select
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                setHasExplicitInput(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {formatTimeLabel(time)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <select
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
                setHasExplicitInput(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              {timeOptions
                .filter((time) => time > startTime)
                .map((time) => (
                  <option key={time} value={time}>
                    {formatTimeLabel(time)}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Tag selection */}
        {preferences.tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tag
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedTag("")}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  !selectedTag
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                None
              </button>
              {preferences.tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSelectedTag(tag.id)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    selectedTag === tag.id
                      ? "text-white border-transparent"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                  style={{
                    backgroundColor:
                      selectedTag === tag.id ? tag.color : undefined,
                    borderColor: selectedTag === tag.id ? tag.color : undefined,
                  }}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={!title.trim() || !startTime || !endTime}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isEditing ? "Update Event" : "Create Event"}
          </button>

          {isEditing && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
