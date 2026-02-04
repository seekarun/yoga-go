"use client";

import { useState, useEffect } from "react";
import Modal, { ModalHeader, ModalFooter } from "@/components/Modal";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import type { CreateCalendarEventInput } from "@/types";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: Date | null;
  tenantId: string;
  onEventCreated: () => void;
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

function formatDateForInput(date: Date): string {
  return date.toISOString().slice(0, 16);
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

export default function CreateEventModal({
  isOpen,
  onClose,
  initialDate,
  tenantId: _tenantId,
  onEventCreated,
}: CreateEventModalProps) {
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [color, setColor] = useState(EVENT_COLORS[0].value);
  const [isAllDay, setIsAllDay] = useState(false);
  const [notes, setNotes] = useState("");
  const [hasVideoConference, setHasVideoConference] = useState(false);

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
      const end = addHours(start, 1);

      setTitle("");
      setDescription("");
      setStartTime(formatDateForInput(start));
      setEndTime(formatDateForInput(end));
      setLocation("");
      setColor(EVENT_COLORS[0].value);
      setIsAllDay(false);
      setNotes("");
      setHasVideoConference(false);
      setError("");
    }
  }, [isOpen, initialDate]);

  // Handle start time change - auto-adjust end time
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);

    // Auto-set end time to 1 hour after start
    const startDate = new Date(newStart);
    if (!isNaN(startDate.getTime())) {
      const endDate = addHours(startDate, 1);
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
        type: "general", // Cally only supports general events
        location,
        isAllDay,
        color,
        notes,
        hasVideoConference,
      };

      const response = await fetch("/api/data/app/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
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
      <ModalHeader onClose={onClose}>Create Event</ModalHeader>

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

          {/* Video Conferencing */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasVideoConference"
              checked={hasVideoConference}
              onChange={(e) => setHasVideoConference(e.target.checked)}
              className="w-4 h-4 rounded text-[var(--color-primary,#6366f1)] focus:ring-[var(--color-primary,#6366f1)]"
            />
            <label
              htmlFor="hasVideoConference"
              className="text-sm text-gray-700"
            >
              Add video conferencing
            </label>
            {hasVideoConference && (
              <span className="text-xs text-gray-500 ml-1">
                (100ms video room will be created)
              </span>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Zoom, Office, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] focus:border-transparent"
            />
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
            {isSubmitting ? "Creating..." : "Create Event"}
          </PrimaryButton>
        </ModalFooter>
      </form>
    </Modal>
  );
}
