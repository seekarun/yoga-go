"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type {
  CallyUser,
  Email,
  CalendarEvent,
  ContactSubmission,
  FeedbackRequest,
} from "@/types";

interface UserFileData {
  user: CallyUser;
  communications: Email[];
  bookings: CalendarEvent[];
  contacts: ContactSubmission[];
  feedbackRequests: FeedbackRequest[];
}

// Unified timeline item
type TimelineItem =
  | { type: "email"; date: string; data: Email }
  | { type: "booking"; date: string; data: CalendarEvent }
  | { type: "contact"; date: string; data: ContactSubmission }
  | { type: "feedback"; date: string; data: FeedbackRequest };

export default function UserFilePage() {
  const params = useParams();
  const expertId = params.expertId as string;
  const userEmail = params.userEmail as string;
  const decodedEmail = decodeURIComponent(userEmail);

  const [data, setData] = useState<UserFileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Feedback request state
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(
    "I'd love to hear your feedback! Please take a moment to share your experience.",
  );
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log("[DBG][userFile] Fetching user file:", decodedEmail);

      const res = await fetch(
        `/api/data/app/users/${encodeURIComponent(decodedEmail)}`,
      );
      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load user");
      }
    } catch {
      setError("Failed to load user file");
    } finally {
      setLoading(false);
    }
  }, [decodedEmail]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sendFeedbackRequest = useCallback(async () => {
    if (!data?.user) return;
    setFeedbackSending(true);
    setFeedbackError(null);
    try {
      const res = await fetch("/api/data/app/feedback/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.user.email,
          name: data.user.name,
          customMessage: feedbackMessage.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedbackSuccess(true);
        fetchData();
        setTimeout(() => {
          setShowFeedbackForm(false);
          setFeedbackSuccess(false);
        }, 3000);
      } else {
        setFeedbackError(json.error || "Failed to send feedback request");
      }
    } catch {
      setFeedbackError("Failed to send feedback request");
    } finally {
      setFeedbackSending(false);
    }
  }, [data?.user, feedbackMessage, fetchData]);

  // All hooks must be called before any early returns
  const allItems: TimelineItem[] = useMemo(() => {
    if (!data) return [];
    const { communications, bookings, contacts, feedbackRequests } = data;
    const items: TimelineItem[] = [
      ...communications.map(
        (email) =>
          ({
            type: "email",
            date: email.receivedAt,
            data: email,
          }) as TimelineItem,
      ),
      ...bookings.map(
        (booking) =>
          ({
            type: "booking",
            date: booking.startTime,
            data: booking,
          }) as TimelineItem,
      ),
      ...(contacts || []).map(
        (contact) =>
          ({
            type: "contact",
            date: contact.submittedAt,
            data: contact,
          }) as TimelineItem,
      ),
      ...(feedbackRequests || []).map(
        (fb) =>
          ({
            type: "feedback",
            date: fb.submittedAt || fb.createdAt,
            data: fb,
          }) as TimelineItem,
      ),
    ];
    return items;
  }, [data]);

  const now = useMemo(() => new Date().toISOString(), []);

  const upcoming = useMemo(
    () =>
      allItems
        .filter((item) => item.date > now)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [allItems, now],
  );

  const past = useMemo(
    () =>
      allItems
        .filter((item) => item.date <= now)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [allItems, now],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
        <span className="ml-3 text-[var(--text-muted)]">
          Loading user file...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || "User not found"}</p>
          <Link
            href={`/srv/${expertId}/users`}
            className="inline-block mt-4 text-sm text-[var(--color-primary)] hover:underline"
          >
            Back to Users
          </Link>
        </div>
      </div>
    );
  }

  const { user } = data;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/srv/${expertId}/users`}
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors mb-4"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Users
        </Link>

        <div className="flex items-center gap-4">
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- small avatar from external source
            <img src={user.avatar} alt="" className="h-14 w-14 rounded-full" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-xl font-medium text-[var(--color-primary)]">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)]">
              {user.name}
            </h1>
            <p className="text-[var(--text-muted)]">{user.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <TypeBadge userType={user.userType} />
              {user.subscribedAt && (
                <span className="text-xs text-[var(--text-muted)]">
                  Member since {formatDate(user.subscribedAt)}
                </span>
              )}
              {user.lastBookingDate && (
                <span className="text-xs text-[var(--text-muted)]">
                  Last booking {formatDate(user.lastBookingDate)}
                </span>
              )}
              {user.totalBookings ? (
                <span className="text-xs text-[var(--text-muted)]">
                  {user.totalBookings} booking
                  {user.totalBookings !== 1 ? "s" : ""}
                </span>
              ) : null}
              {user.lastContactDate && (
                <span className="text-xs text-[var(--text-muted)]">
                  Last contact {formatDate(user.lastContactDate)}
                </span>
              )}
              {user.totalContacts ? (
                <span className="text-xs text-[var(--text-muted)]">
                  {user.totalContacts} contact
                  {user.totalContacts !== 1 ? "s" : ""}
                </span>
              ) : null}
            </div>
          </div>

          {/* Request Feedback Button */}
          <button
            type="button"
            onClick={() => setShowFeedbackForm(!showFeedbackForm)}
            className="ml-auto flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors"
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
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            Request Feedback
          </button>
        </div>

        {/* Feedback Request Inline Form */}
        {showFeedbackForm && (
          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            {feedbackSuccess ? (
              <div className="flex items-center gap-2 text-green-700">
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm font-medium">
                  Feedback request sent to {user.email}
                </span>
              </div>
            ) : (
              <>
                <label
                  htmlFor="feedback-msg"
                  className="block text-sm font-medium text-purple-800 mb-2"
                >
                  Message to include in the email
                </label>
                <textarea
                  id="feedback-msg"
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-purple-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                {feedbackError && (
                  <p className="mt-2 text-sm text-red-600">{feedbackError}</p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={sendFeedbackRequest}
                    disabled={feedbackSending}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {feedbackSending ? "Sending..." : "Send Request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFeedbackForm(false)}
                    className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* No activity at all */}
      {allItems.length === 0 && (
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-[var(--text-muted)]">
            No activity yet with this user.
          </p>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
            Upcoming
            <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
              ({upcoming.length})
            </span>
          </h2>
          <div className="space-y-3">
            {upcoming.map((item) => (
              <TimelineEntry
                key={`${item.type}-${item.data.id}`}
                item={item}
                expertId={expertId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
            Past
            <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
              ({past.length})
            </span>
          </h2>
          <div className="space-y-3">
            {past.map((item) => (
              <TimelineEntry
                key={`${item.type}-${item.data.id}`}
                item={item}
                expertId={expertId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineEntry({
  item,
  expertId,
}: {
  item: TimelineItem;
  expertId: string;
}) {
  if (item.type === "email") {
    return <EmailEntry email={item.data} expertId={expertId} />;
  }
  if (item.type === "booking") {
    return <BookingEntry booking={item.data} />;
  }
  if (item.type === "feedback") {
    return <FeedbackEntry feedback={item.data} />;
  }
  return <ContactEntry contact={item.data} />;
}

function ContactEntry({ contact }: { contact: ContactSubmission }) {
  const snippet =
    contact.message.length > 120
      ? contact.message.substring(0, 120) + "..."
      : contact.message;

  return (
    <div className="bg-white rounded-lg border border-[var(--color-border)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
              Contact
            </span>
            <span className="text-sm font-medium text-[var(--text-main)] truncate">
              Contact form submission
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] line-clamp-2">
            {snippet}
          </p>
        </div>
        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
          {formatDateTime(contact.submittedAt)}
        </span>
      </div>
    </div>
  );
}

function FeedbackEntry({ feedback }: { feedback: FeedbackRequest }) {
  const isSubmitted = feedback.status === "submitted";

  return (
    <div className="bg-white rounded-lg border border-[var(--color-border)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700">
              {isSubmitted ? "Review Submitted" : "Requested Review"}
            </span>
            {isSubmitted && feedback.rating && (
              <span className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill={star <= feedback.rating! ? "#f59e0b" : "#d1d5db"}
                    stroke="none"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </span>
            )}
            {feedback.approved && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700">
                Approved
              </span>
            )}
          </div>
          {isSubmitted && feedback.message ? (
            <p className="text-sm text-[var(--text-muted)] line-clamp-2">
              &ldquo;
              {feedback.message.length > 120
                ? feedback.message.substring(0, 120) + "..."
                : feedback.message}
              &rdquo;
            </p>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Feedback request sent — awaiting response
            </p>
          )}
        </div>
        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
          {formatDateTime(feedback.submittedAt || feedback.createdAt)}
        </span>
      </div>
    </div>
  );
}

function EmailEntry({ email, expertId }: { email: Email; expertId: string }) {
  const snippet =
    email.bodyText.length > 120
      ? email.bodyText.substring(0, 120) + "..."
      : email.bodyText;

  return (
    <Link
      href={`/srv/${expertId}/inbox/${email.id}`}
      className="block bg-white rounded-lg border border-[var(--color-border)] p-4 hover:border-[var(--color-primary)]/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <DirectionBadge isOutgoing={email.isOutgoing} />
            <span className="text-sm font-medium text-[var(--text-main)] truncate">
              {email.subject || "(no subject)"}
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] line-clamp-2">
            {snippet}
          </p>
        </div>
        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
          {formatDateTime(email.receivedAt)}
        </span>
      </div>
    </Link>
  );
}

function BookingEntry({ booking }: { booking: CalendarEvent }) {
  return (
    <div className="bg-white rounded-lg border border-[var(--color-border)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700">
              Booking
            </span>
            <BookingStatusBadge status={booking.status} />
            <span className="text-sm font-medium text-[var(--text-main)] truncate">
              {booking.title.replace(/^Booking:\s*/, "")}
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            {formatBookingTime(booking.startTime, booking.endTime)}
            {booking.duration ? ` (${booking.duration} min)` : ""}
          </p>
        </div>
        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
          {formatDateTime(booking.startTime)}
        </span>
      </div>
    </div>
  );
}

function BookingStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: "bg-green-50 text-green-700",
    pending: "bg-yellow-50 text-yellow-700",
    cancelled: "bg-red-50 text-red-700",
    completed: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-600"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function DirectionBadge({ isOutgoing }: { isOutgoing: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isOutgoing ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {isOutgoing ? "Sent" : "Received"}
    </span>
  );
}

function TypeBadge({ userType }: { userType: string }) {
  const styles: Record<string, string> = {
    registered: "bg-emerald-50 text-emerald-700",
    visitor: "bg-amber-50 text-amber-700",
    contact: "bg-blue-50 text-blue-700",
  };
  const labels: Record<string, string> = {
    registered: "Registered",
    visitor: "Visitor",
    contact: "Contact",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[userType] || "bg-gray-100 text-gray-600"}`}
    >
      {labels[userType] || userType}
    </span>
  );
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBookingTime(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const dateStr = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startStr = start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endStr = end.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr}, ${startStr} - ${endStr}`;
}
