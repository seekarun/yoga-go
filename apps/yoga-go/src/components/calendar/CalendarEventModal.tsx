'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Modal, { ModalHeader, ModalFooter } from '@/components/Modal';
import { PrimaryButton, SecondaryButton } from '@/components/Button';
import type { CalendarItem } from '@/types';

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarItem | null;
  expertId: string;
  onEventUpdated: () => void;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
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
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
}

function getStatusBadge(status?: string) {
  if (!status) return null;

  const styles: Record<string, { bg: string; text: string; label: string }> = {
    scheduled: { bg: '#dbeafe', text: '#1d4ed8', label: 'Scheduled' },
    completed: { bg: '#d1fae5', text: '#059669', label: 'Completed' },
    cancelled: { bg: '#fef3c7', text: '#d97706', label: 'Cancelled' },
    DRAFT: { bg: '#f3f4f6', text: '#4b5563', label: 'Draft' },
    SCHEDULED: { bg: '#dbeafe', text: '#1d4ed8', label: 'Scheduled' },
    LIVE: { bg: '#fee2e2', text: '#dc2626', label: 'Live' },
    COMPLETED: { bg: '#d1fae5', text: '#059669', label: 'Completed' },
    CANCELLED: { bg: '#fef3c7', text: '#d97706', label: 'Cancelled' },
  };

  const style = styles[status] || { bg: '#f3f4f6', text: '#4b5563', label: status };

  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
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
  expertId,
  onEventUpdated,
}: CalendarEventModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Reset state when event changes
  useEffect(() => {
    if (event) {
      setEditTitle(event.title);
      setEditDescription(event.extendedProps.description || '');
      setEditLocation(event.extendedProps.location || '');
      setIsEditing(false);
      setIsDeleting(false);
      setError('');
    }
  }, [event]);

  const handleDelete = async () => {
    if (!event) return;

    // For live sessions, don't allow deleting from here
    if (event.type === 'live_session') {
      setError('Please delete live sessions from the Live Sessions page');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      // Extract event ID (remove any prefix)
      const eventId = event.id.replace('evt_', '').startsWith('evt_') ? event.id : event.id;

      const response = await fetch(`/data/app/expert/me/calendar/events/${eventId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete event');
      }

      console.log('[DBG][CalendarEventModal] Deleted event:', event.id);
      onEventUpdated();
    } catch (err) {
      console.error('[DBG][CalendarEventModal] Error deleting:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!event) return;

    // For live sessions, don't allow editing from here
    if (event.type === 'live_session') {
      setError('Please edit live sessions from the Live Sessions page');
      return;
    }

    setError('');

    try {
      const response = await fetch(`/data/app/expert/me/calendar/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          location: editLocation,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update event');
      }

      console.log('[DBG][CalendarEventModal] Updated event:', event.id);
      setIsEditing(false);
      onEventUpdated();
    } catch (err) {
      console.error('[DBG][CalendarEventModal] Error updating:', err);
      setError(err instanceof Error ? err.message : 'Failed to update event');
    }
  };

  const copyMeetingLink = () => {
    if (event?.extendedProps.meetingLink) {
      navigator.clipboard.writeText(event.extendedProps.meetingLink);
    }
  };

  if (!event) return null;

  const isLiveSession = event.type === 'live_session';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <ModalHeader title={isEditing ? 'Edit Event' : 'Event Details'} onClose={onClose} />

      <div className="p-6 space-y-4">
        {/* Event Type Badge */}
        <div className="flex items-center gap-2">
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              background: isLiveSession ? 'rgba(125, 142, 116, 0.2)' : 'rgba(163, 86, 56, 0.2)',
              color: isLiveSession ? '#5a6b53' : '#8b472e',
            }}
          >
            {isLiveSession ? 'Live Session' : 'Event'}
          </span>
          {getStatusBadge(event.extendedProps.status)}
        </div>

        {/* Title */}
        {isEditing ? (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>
              Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
              }}
            />
          </div>
        ) : (
          <h3 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>
            {event.title}
          </h3>
        )}

        {/* Time */}
        <div className="flex items-start gap-3">
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-bg-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium" style={{ color: 'var(--text-main)' }}>
              {formatDateTime(event.start)}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Duration: {formatDuration(event.start, event.end)}
            </p>
          </div>
        </div>

        {/* Description */}
        {isEditing ? (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>
              Description
            </label>
            <textarea
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>
        ) : event.extendedProps.description ? (
          <div className="flex items-start gap-3">
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-bg-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-body)' }}>
              {event.extendedProps.description}
            </p>
          </div>
        ) : null}

        {/* Location */}
        {isEditing ? (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>
              Location
            </label>
            <input
              type="text"
              value={editLocation}
              onChange={e => setEditLocation(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
              }}
            />
          </div>
        ) : event.extendedProps.location ? (
          <div className="flex items-start gap-3">
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-bg-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24">
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
            <p className="text-sm" style={{ color: 'var(--text-body)' }}>
              {event.extendedProps.location}
            </p>
          </div>
        ) : null}

        {/* Meeting Link (for live sessions) */}
        {event.extendedProps.meetingLink && (
          <div className="flex items-start gap-3">
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-bg-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                Meeting Link
              </p>
              <div className="flex items-center gap-2 mt-1">
                <a
                  href={event.extendedProps.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Join Meeting
                </a>
                <button
                  onClick={copyMeetingLink}
                  className="text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Link to Webinar (for live sessions) */}
        {isLiveSession && event.extendedProps.webinarId && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-bg-main)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
            }}
          >
            <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
              This is part of a live session webinar
            </p>
            <Link
              href={`/srv/${expertId}/webinars/${event.extendedProps.webinarId}`}
              style={{
                color: 'var(--color-primary)',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Manage Webinar &rarr;
            </Link>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}
      </div>

      <ModalFooter>
        {isEditing ? (
          <>
            <SecondaryButton onClick={() => setIsEditing(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleSaveEdit}>Save Changes</PrimaryButton>
          </>
        ) : (
          <>
            {!isLiveSession && (
              <>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #fecaca',
                    backgroundColor: isDeleting ? '#fee2e2' : 'white',
                    color: '#dc2626',
                    fontWeight: '500',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    opacity: isDeleting ? 0.7 : 1,
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
                <SecondaryButton onClick={() => setIsEditing(true)}>Edit</SecondaryButton>
              </>
            )}
            <PrimaryButton onClick={onClose}>Close</PrimaryButton>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
