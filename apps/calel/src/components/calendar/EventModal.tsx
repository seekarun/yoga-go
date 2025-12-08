"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { usePreferences } from "@/contexts";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  tagId?: string; // Optional tag for categorization
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, "id">) => void;
  date: Date;
  initialTime: string; // HH:mm
}

// Generate time options in 15-minute increments
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

const TIME_OPTIONS = generateTimeOptions();

function formatTimeDisplay(time: string, use24h: boolean): string {
  const [hour, minute] = time.split(":").map(Number);
  if (use24h) {
    return time;
  }
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}

export function EventModal({
  isOpen,
  onClose,
  onSave,
  date,
  initialTime,
}: EventModalProps) {
  const { preferences } = usePreferences();
  const use24h = preferences.timeFormat === "24h";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState(initialTime);
  const [endTime, setEndTime] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>(
    undefined,
  );

  // Set default end time to 30 minutes after start
  useEffect(() => {
    const startIndex = TIME_OPTIONS.indexOf(initialTime);
    if (startIndex !== -1 && startIndex < TIME_OPTIONS.length - 1) {
      setEndTime(TIME_OPTIONS[startIndex + 1]);
    } else {
      setEndTime(TIME_OPTIONS[0]);
    }
    setStartTime(initialTime);
  }, [initialTime]);

  // Update end time when start time changes
  useEffect(() => {
    const startIndex = TIME_OPTIONS.indexOf(startTime);
    const endIndex = TIME_OPTIONS.indexOf(endTime);
    if (startIndex >= endIndex) {
      // End time should be after start time
      if (startIndex < TIME_OPTIONS.length - 1) {
        setEndTime(TIME_OPTIONS[startIndex + 1]);
      }
    }
  }, [startTime, endTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      date: format(date, "yyyy-MM-dd"),
      startTime,
      endTime,
      tagId: selectedTagId,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setSelectedTagId(undefined);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Add Event</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <svg
                className="w-5 h-5"
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
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {format(date, "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting with client"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
            />
          </div>

          {/* Time selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {formatTimeDisplay(time, use24h)}
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
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {TIME_OPTIONS.filter((time) => time > startTime).map((time) => (
                  <option key={time} value={time}>
                    {formatTimeDisplay(time, use24h)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tag Selection */}
          {preferences.tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tag
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTagId(undefined)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    selectedTagId === undefined
                      ? "border-gray-800 bg-gray-100 text-gray-800"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  None
                </button>
                {preferences.tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setSelectedTagId(tag.id)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors flex items-center gap-1.5 ${
                      selectedTagId === tag.id
                        ? "border-gray-800"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
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
              placeholder="Add details about this event..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
