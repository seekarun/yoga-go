"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Modal, { ModalHeader, ModalFooter } from "@/components/Modal";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import TranscriptViewer from "@/components/TranscriptViewer";
import type { CalendarItem } from "@/types";

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarItem | null;
  tenantId: string;
  onEventUpdated: () => void;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins} min`;
  }

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0
    ? `${hours}h ${mins}m`
    : `${hours} hour${hours > 1 ? "s" : ""}`;
}

function getStatusBadge(status?: string) {
  if (!status) return null;

  const styles: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "#fef3c7", text: "#b45309", label: "Pending" },
    scheduled: { bg: "#dbeafe", text: "#1d4ed8", label: "Scheduled" },
    completed: { bg: "#d1fae5", text: "#059669", label: "Completed" },
    cancelled: { bg: "#fee2e2", text: "#dc2626", label: "Cancelled" },
  };

  const style = styles[status] || {
    bg: "#f3f4f6",
    text: "#4b5563",
    label: status,
  };

  return (
    <span
      className="px-2 py-1 rounded-full text-xs font-semibold"
      style={{
        background: style.bg,
        color: style.text,
      }}
    >
      {style.label}
    </span>
  );
}

export default function CalendarEventModal({
  isOpen,
  onClose,
  event,
  tenantId: _tenantId,
  onEventUpdated,
}: CalendarEventModalProps) {
  const router = useRouter();
  const params = useParams();
  const expertId = params.expertId as string;

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [isDeletingSeries, setIsDeletingSeries] = useState(false);
  const [error, setError] = useState("");

  // Check if event is recurring
  const isRecurring = !!event?.extendedProps?.recurrenceGroupId;

  // Check if event has video conferencing
  const hasVideoConference = event?.extendedProps?.hasVideoConference;
  const hasMeetingLink = !!event?.extendedProps?.meetingLink;
  const hasHmsRoom = !!event?.extendedProps?.hmsRoomId;

  const handleJoinMeeting = () => {
    if (!event) return;
    // If the event has an external meeting link (Zoom/Google Meet), open it directly
    if (hasMeetingLink) {
      window.open(event.extendedProps.meetingLink, "_blank", "noopener");
      return;
    }
    // Otherwise use built-in 100ms video room
    router.push(`/srv/${expertId}/live/${event.id}`);
  };

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");

  // Reset state when event changes
  useEffect(() => {
    if (event) {
      setEditTitle(event.title);
      setEditDescription(event.extendedProps.description || "");
      setEditLocation(event.extendedProps.location || "");
      setIsEditing(false);
      setIsDeleting(false);
      setIsSaving(false);
      setShowCancelForm(false);
      setIsDeletingSeries(false);
      setError("");
    }
  }, [event]);

  const handleDelete = async () => {
    if (!event) return;

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/data/app/calendar/events/${event.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to delete event");
      }

      console.log("[DBG][CalendarEventModal] Deleted event:", event.id);
      onEventUpdated();
    } catch (err) {
      console.error("[DBG][CalendarEventModal] Error deleting:", err);
      setError(err instanceof Error ? err.message : "Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSeries = async () => {
    if (!event) return;

    setIsDeletingSeries(true);
    setError("");

    try {
      const response = await fetch(
        `/api/data/app/calendar/events/${event.id}?deleteAll=true`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to delete series");
      }

      console.log(
        "[DBG][CalendarEventModal] Deleted series, count:",
        data.data.count,
      );
      onEventUpdated();
    } catch (err) {
      console.error("[DBG][CalendarEventModal] Error deleting series:", err);
      setError(err instanceof Error ? err.message : "Failed to delete series");
    } finally {
      setIsDeletingSeries(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!event) return;

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/data/app/calendar/events/${event.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editTitle,
            description: editDescription,
            location: editLocation,
          }),
        },
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update event");
      }

      console.log("[DBG][CalendarEventModal] Updated event:", event.id);
      setIsEditing(false);
      onEventUpdated();
    } catch (err) {
      console.error("[DBG][CalendarEventModal] Error updating:", err);
      setError(err instanceof Error ? err.message : "Failed to update event");
    } finally {
      setIsSaving(false);
    }
  };

  const isPending = event?.extendedProps?.status === "pending";
  const isScheduled = event?.extendedProps?.status === "scheduled";
  // A booking event has visitor info in the description
  const isBooking = !!event?.title?.startsWith("Booking:");

  // Message to include in the email sent to the visitor
  const DEFAULT_ACCEPT_MESSAGE =
    "Thank you for your booking! I look forward to meeting with you.";
  const DEFAULT_DECLINE_MESSAGE =
    "I'm sorry, but I'm unable to accommodate this time. Please feel free to book another time that works for you.";
  const DEFAULT_CANCEL_MESSAGE =
    "I'm sorry, but I need to cancel our upcoming booking. I apologise for the inconvenience. Please feel free to book another time that works for you.";

  const [visitorMessage, setVisitorMessage] = useState(DEFAULT_ACCEPT_MESSAGE);
  const [cancelMessage, setCancelMessage] = useState(DEFAULT_CANCEL_MESSAGE);

  const handleAccept = async () => {
    if (!event) return;

    setIsAccepting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/data/app/calendar/events/${event.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "scheduled",
            color: "#10b981",
            message: visitorMessage,
          }),
        },
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to accept booking");
      }

      console.log("[DBG][CalendarEventModal] Accepted booking:", event.id);
      onEventUpdated();
    } catch (err) {
      console.error("[DBG][CalendarEventModal] Error accepting:", err);
      setError(err instanceof Error ? err.message : "Failed to accept booking");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async (messageOverride?: string) => {
    if (!event) return;

    setIsDeclining(true);
    setError("");

    const msg = messageOverride ?? visitorMessage;

    try {
      const response = await fetch(
        `/api/data/app/calendar/events/${event.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "cancelled",
            message: msg,
          }),
        },
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to decline booking");
      }

      console.log("[DBG][CalendarEventModal] Declined booking:", event.id);
      onEventUpdated();
    } catch (err) {
      console.error("[DBG][CalendarEventModal] Error declining:", err);
      setError(
        err instanceof Error ? err.message : "Failed to decline booking",
      );
    } finally {
      setIsDeclining(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!event) return;

    setIsCancelling(true);
    setError("");

    try {
      const response = await fetch(
        `/api/data/app/calendar/events/${event.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "cancelled",
            message: cancelMessage,
          }),
        },
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to cancel booking");
      }

      console.log("[DBG][CalendarEventModal] Cancelled booking:", event.id);
      onEventUpdated();
    } catch (err) {
      console.error("[DBG][CalendarEventModal] Error cancelling:", err);
      setError(err instanceof Error ? err.message : "Failed to cancel booking");
    } finally {
      setIsCancelling(false);
    }
  };

  if (!event) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      padding={false}
    >
      <ModalHeader onClose={onClose}>
        {isEditing ? "Edit Event" : "Event Details"}
      </ModalHeader>

      <div className="px-6 pb-2 space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-1 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(99, 102, 241, 0.2)",
              color: "#4338ca",
            }}
          >
            Event
          </span>
          {getStatusBadge(event.extendedProps.status)}
          {isRecurring && (
            <span
              className="px-2 py-1 rounded-full text-xs font-semibold"
              style={{
                background: "#ede9fe",
                color: "#7c3aed",
              }}
            >
              Recurring
            </span>
          )}
        </div>

        {/* Title */}
        {isEditing ? (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] focus:border-transparent"
            />
          </div>
        ) : (
          <h3 className="text-xl font-semibold text-gray-900">{event.title}</h3>
        )}

        {/* Time */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {formatDateTime(event.start)}
            </p>
            <p className="text-sm text-gray-500">
              Duration: {formatDuration(event.start, event.end)}
            </p>
          </div>
        </div>

        {/* Description */}
        {isEditing ? (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Description
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] focus:border-transparent resize-y"
            />
          </div>
        ) : event.extendedProps.description ? (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-700">
              {event.extendedProps.description}
            </p>
          </div>
        ) : null}

        {/* Location */}
        {isEditing ? (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Location
            </label>
            <input
              type="text"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] focus:border-transparent"
            />
          </div>
        ) : event.extendedProps.location ? (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-700">
              {event.extendedProps.location}
            </p>
          </div>
        ) : null}

        {/* Meeting Link (Google Meet or Zoom) */}
        {event.extendedProps.meetingLink && !isEditing && (
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                event.extendedProps.meetingLink.includes("zoom.us")
                  ? "bg-blue-50"
                  : "bg-blue-50"
              }`}
            >
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {event.extendedProps.meetingLink.includes("zoom.us")
                  ? "Zoom Meeting"
                  : "Google Meet"}
              </p>
              <a
                href={event.extendedProps.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-1 inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium text-sm transition-colors ${
                  event.extendedProps.meetingLink.includes("zoom.us")
                    ? "bg-[#2D8CFF] hover:bg-[#2681F0]"
                    : "bg-[#1a73e8] hover:bg-[#1557b0]"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                {event.extendedProps.meetingLink.includes("zoom.us")
                  ? "Join Zoom Meeting"
                  : "Join with Google Meet"}
              </a>
            </div>
          </div>
        )}

        {/* Video Conferencing (100ms - only when no external meeting link) */}
        {hasVideoConference && hasHmsRoom && !hasMeetingLink && !isEditing && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Video Conferencing Enabled
              </p>
              <button
                onClick={handleJoinMeeting}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Join Meeting
              </button>
            </div>
          </div>
        )}

        {/* Transcript */}
        {hasVideoConference && !isEditing && (
          <TranscriptViewer eventId={event.id} />
        )}

        {/* Message to visitor (for pending bookings) */}
        {isPending && !isEditing && (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Message to visitor
            </label>
            <textarea
              value={visitorMessage}
              onChange={(e) => setVisitorMessage(e.target.value)}
              rows={3}
              placeholder="Add a personal message..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] focus:border-transparent resize-y"
            />
            <p className="mt-1 text-xs text-gray-400">
              This message will be included in the email to the visitor.
            </p>
          </div>
        )}

        {/* Cancel booking form (for confirmed booking events) */}
        {showCancelForm && isScheduled && isBooking && !isEditing && (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Cancellation message to visitor
            </label>
            <textarea
              value={cancelMessage}
              onChange={(e) => setCancelMessage(e.target.value)}
              rows={3}
              placeholder="Add a personal message..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] focus:border-transparent resize-y"
            />
            <p className="mt-1 text-xs text-gray-400">
              This message will be included in the cancellation email.
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>

      <ModalFooter className="px-6 pb-6">
        {isEditing ? (
          <>
            <SecondaryButton
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </PrimaryButton>
          </>
        ) : isPending ? (
          <>
            <button
              onClick={() => {
                // If message is still the accept default, swap to decline default
                const msg =
                  visitorMessage === DEFAULT_ACCEPT_MESSAGE
                    ? DEFAULT_DECLINE_MESSAGE
                    : visitorMessage;
                setVisitorMessage(msg);
                handleDecline(msg);
              }}
              disabled={isDeclining || isAccepting}
              className="px-4 py-2 rounded-lg border border-red-200 bg-white text-red-600 font-medium text-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeclining ? "Declining..." : "Decline"}
            </button>
            <PrimaryButton
              onClick={handleAccept}
              disabled={isAccepting || isDeclining}
            >
              {isAccepting ? "Accepting..." : "Accept"}
            </PrimaryButton>
          </>
        ) : (
          <>
            <button
              onClick={handleDelete}
              disabled={isDeleting || isDeletingSeries || isCancelling}
              className="px-4 py-2 rounded-lg border border-red-200 bg-white text-red-600 font-medium text-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
            {isRecurring && (
              <button
                onClick={handleDeleteSeries}
                disabled={isDeleting || isDeletingSeries || isCancelling}
                className="px-4 py-2 rounded-lg border border-red-200 bg-red-600 text-white font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingSeries ? "Deleting..." : "Delete All in Series"}
              </button>
            )}
            {isScheduled && isBooking && !showCancelForm && (
              <button
                onClick={() => setShowCancelForm(true)}
                className="px-4 py-2 rounded-lg border border-orange-200 bg-white text-orange-600 font-medium text-sm hover:bg-orange-50"
              >
                Cancel Booking
              </button>
            )}
            {showCancelForm && isScheduled && isBooking && (
              <button
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="px-4 py-2 rounded-lg border border-red-200 bg-red-600 text-white font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancel"}
              </button>
            )}
            {!showCancelForm && (
              <SecondaryButton onClick={() => setIsEditing(true)}>
                Edit
              </SecondaryButton>
            )}
            <PrimaryButton
              onClick={
                showCancelForm ? () => setShowCancelForm(false) : onClose
              }
            >
              {showCancelForm ? "Back" : "Close"}
            </PrimaryButton>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
