"use client";

import { useState, useEffect, useCallback } from "react";
import Modal, { ModalHeader, ModalFooter } from "@/components/Modal";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import RecurrenceSelector from "@/components/calendar/RecurrenceSelector";
import AttendeeSelector from "@/components/calendar/AttendeeSelector";
import type {
  CreateCalendarEventInput,
  EventAttendee,
  RecurrenceRule,
} from "@/types";
import type {
  DateFormatOption,
  TimeFormatOption,
} from "@/lib/formatPreferences";
import { formatDateForInput } from "@/lib/dateUtils";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: Date | null;
  tenantId: string;
  onEventCreated: () => void;
  videoCallPreference?: "cally" | "google_meet" | "zoom";
  defaultDurationMinutes?: number;
  dateFormat?: DateFormatOption;
  timeFormat?: TimeFormatOption;
}

// Predefined colors for events
const EVENT_COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Orange", value: "#f97316" },
  { name: "Pink", value: "#ec4899" },
];

function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

export default function CreateEventModal({
  isOpen,
  onClose,
  initialDate,
  tenantId: _tenantId,
  onEventCreated,
  videoCallPreference = "cally",
  defaultDurationMinutes = 30,
  dateFormat: _dateFormat,
  timeFormat: _timeFormat,
}: CreateEventModalProps) {
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location] = useState("");
  const [color, setColor] = useState(EVENT_COLORS[0].value);
  const [isAllDay, setIsAllDay] = useState(false);
  const [notes, setNotes] = useState("");
  const [hasVideoConference, setHasVideoConference] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(
    null,
  );
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [notifyAttendees, setNotifyAttendees] = useState(true);

  const isRecurring = recurrenceRule !== null;

  const handleRecurrenceChange = useCallback(
    (rule: RecurrenceRule | null) => {
      setRecurrenceRule(rule);
      // Disable video conferencing when recurring
      if (rule && hasVideoConference) {
        setHasVideoConference(false);
      }
    },
    [hasVideoConference],
  );

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && initialDate) {
      const start = new Date(initialDate);
      // Set to 9 AM if clicking on a day
      if (start.getHours() === 0) {
        start.setHours(9, 0, 0, 0);
      }
      const end = addMinutes(start, defaultDurationMinutes);

      setTitle("");
      setDescription("");
      setStartTime(formatDateForInput(start));
      setEndTime(formatDateForInput(end));
      setColor(EVENT_COLORS[0].value);
      setIsAllDay(false);
      setNotes("");
      setHasVideoConference(false);
      setRecurrenceRule(null);
      setAttendees([]);
      setNotifyAttendees(true);
      setError("");
    }
  }, [isOpen, initialDate, defaultDurationMinutes]);

  // Handle start time change - auto-adjust end time
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);

    // Auto-set end time only if current end is behind the new start
    const startDate = new Date(newStart);
    const currentEnd = new Date(endTime);
    if (!isNaN(startDate.getTime()) && currentEnd <= startDate) {
      const endDate = addMinutes(startDate, defaultDurationMinutes);
      setEndTime(formatDateForInput(endDate));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!startTime || !endTime) {
      setError("Start and end times are required");
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      setError("End time must be after start time");
      return;
    }

    setIsSubmitting(true);

    try {
      const input: CreateCalendarEventInput = {
        title,
        description,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        type: "general", // CallyGo only supports general events
        location,
        isAllDay,
        color,
        notes,
        hasVideoConference,
        attendees: attendees.length > 0 ? attendees : undefined,
      };

      // Include recurrence rule and notify flag in the request body
      const body = {
        ...input,
        ...(recurrenceRule ? { recurrenceRule } : {}),
        notifyAttendees: attendees.length > 0 ? notifyAttendees : false,
      };

      const response = await fetch("/api/data/app/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create event");
      }

      console.log("[DBG][CreateEventModal] Created event:", data.data.id);
      onEventCreated();
    } catch (err) {
      console.error("[DBG][CreateEventModal] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-lg"
      padding={false}
    >
      <ModalHeader onClose={onClose} className="px-6 pt-6">
        Create Event
      </ModalHeader>

      <form onSubmit={handleSubmit}>
        <div className="px-6 pb-2 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Event Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Team Meeting"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this event..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] focus:border-transparent resize-y"
            />
          </div>

          {/* Attendees */}
          <AttendeeSelector
            selectedAttendees={attendees}
            onChange={setAttendees}
          />

          {/* Notify attendees */}
          {attendees.length > 0 && (
            <div className="flex items-center gap-2 -mt-2">
              <input
                type="checkbox"
                id="notifyAttendees"
                checked={notifyAttendees}
                onChange={(e) => setNotifyAttendees(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--color-primary,#6366f1)] focus:ring-[var(--color-primary,#6366f1)]"
              />
              <label
                htmlFor="notifyAttendees"
                className="text-sm text-gray-700"
              >
                Email participants event details
              </label>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Start *
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                End *
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] focus:border-transparent"
              />
            </div>
          </div>
          {startTime &&
            endTime &&
            (() => {
              const s = new Date(startTime);
              const e = new Date(endTime);
              const diffMs = e.getTime() - s.getTime();
              if (isNaN(diffMs) || diffMs <= 0) return null;
              const mins = Math.round(diffMs / 60000);
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              const label =
                h > 0
                  ? m > 0
                    ? `${h}h ${m}m`
                    : `${h} hour${h > 1 ? "s" : ""}`
                  : `${m} min`;
              return (
                <p className="text-xs text-gray-400 -mt-2">Duration: {label}</p>
              );
            })()}

          {/* All Day */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAllDay"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="w-4 h-4 rounded text-[var(--color-primary,#6366f1)] focus:ring-[var(--color-primary,#6366f1)]"
            />
            <label htmlFor="isAllDay" className="text-sm text-gray-700">
              All day event
            </label>
          </div>

          {/* Recurrence */}
          <RecurrenceSelector
            startDate={startTime ? new Date(startTime) : null}
            value={recurrenceRule}
            onChange={handleRecurrenceChange}
          />

          {/* Video Conferencing */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasVideoConference"
              checked={hasVideoConference}
              onChange={(e) => setHasVideoConference(e.target.checked)}
              disabled={isRecurring}
              className="w-4 h-4 rounded text-[var(--color-primary,#6366f1)] focus:ring-[var(--color-primary,#6366f1)] disabled:opacity-50"
            />
            <label
              htmlFor="hasVideoConference"
              className={`text-sm ${isRecurring ? "text-gray-400" : "text-gray-700"}`}
            >
              Add video conferencing
            </label>
            {isRecurring && (
              <span className="text-xs text-gray-400 ml-1">
                (Not available for recurring events)
              </span>
            )}
            {hasVideoConference && !isRecurring && (
              <span className="text-xs text-gray-500 ml-1">
                {videoCallPreference === "zoom"
                  ? "(Zoom meeting will be created)"
                  : videoCallPreference === "google_meet"
                    ? "(Google Meet link will be created)"
                    : "(CallyGo video room will be created)"}
              </span>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c.value,
                    border:
                      color === c.value
                        ? "3px solid #111827"
                        : "2px solid transparent",
                  }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private notes..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] focus:border-transparent resize-y"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>

        <ModalFooter className="px-6 pb-6">
          <SecondaryButton
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Creating..."
              : isRecurring
                ? "Create Recurring Event"
                : "Create Event"}
          </PrimaryButton>
        </ModalFooter>
      </form>
    </Modal>
  );
}
