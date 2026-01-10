'use client';

import { useState, useEffect } from 'react';
import Modal, { ModalHeader, ModalFooter } from '@/components/Modal';
import { PrimaryButton, SecondaryButton } from '@/components/Button';
import type { CalendarEventType, CreateCalendarEventInput } from '@/types';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: Date | null;
  expertId: string;
  onEventCreated: () => void;
}

// Predefined colors for events
const EVENT_COLORS = [
  { name: 'Terracotta', value: '#a35638' },
  { name: 'Sage', value: '#7d8e74' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
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
  expertId: _expertId,
  onEventCreated,
}: CreateEventModalProps) {
  // Form state
  const [eventType, setEventType] = useState<CalendarEventType>('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [color, setColor] = useState(EVENT_COLORS[0].value);
  const [isAllDay, setIsAllDay] = useState(false);
  const [notes, setNotes] = useState('');

  // Live session specific
  const [webinarTitle, setWebinarTitle] = useState('');
  const [webinarDescription, setWebinarDescription] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && initialDate) {
      const start = new Date(initialDate);
      // Set to 9 AM if clicking on a day
      if (start.getHours() === 0) {
        start.setHours(9, 0, 0, 0);
      }
      const end = addHours(start, 1);

      setEventType('general');
      setTitle('');
      setDescription('');
      setStartTime(formatDateForInput(start));
      setEndTime(formatDateForInput(end));
      setLocation('');
      setColor(EVENT_COLORS[0].value);
      setIsAllDay(false);
      setNotes('');
      setWebinarTitle('');
      setWebinarDescription('');
      setError('');
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

  // Create general event
  const createGeneralEvent = async () => {
    const input: CreateCalendarEventInput = {
      title,
      description,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      type: 'general',
      location,
      isAllDay,
      color,
      notes,
    };

    const response = await fetch('/data/app/expert/me/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to create event');
    }

    return data.data;
  };

  // Create live session (webinar)
  const createLiveSession = async () => {
    // First create the webinar
    const webinarResponse = await fetch('/data/app/expert/me/webinars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: webinarTitle || title,
        description: webinarDescription || description,
        price: 0,
        currency: 'USD',
        status: 'SCHEDULED',
        videoPlatform: 'none',
        sessions: [
          {
            title: title,
            description: description,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
          },
        ],
      }),
    });

    const webinarData = await webinarResponse.json();
    if (!webinarData.success) {
      throw new Error(webinarData.error || 'Failed to create webinar');
    }

    const webinar = webinarData.data;

    // Also create a calendar event linked to the webinar
    const input: CreateCalendarEventInput = {
      title: `${webinarTitle || title}: ${title}`,
      description,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      type: 'live_session',
      webinarId: webinar.id,
      sessionId: webinar.sessions[0]?.id,
      color: '#7d8e74', // Sage green for live sessions
    };

    const eventResponse = await fetch('/data/app/expert/me/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const eventData = await eventResponse.json();
    if (!eventData.success) {
      console.warn(
        '[DBG][CreateEventModal] Failed to create linked calendar event:',
        eventData.error
      );
    }

    return webinar;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!startTime || !endTime) {
      setError('Start and end times are required');
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      setError('End time must be after start time');
      return;
    }

    setIsSubmitting(true);

    try {
      if (eventType === 'live_session') {
        const webinar = await createLiveSession();
        console.log('[DBG][CreateEventModal] Created live session:', webinar.id);

        // Optionally redirect to webinar management
        // router.push(`/srv/${expertId}/webinars/${webinar.id}`);
      } else {
        const event = await createGeneralEvent();
        console.log('[DBG][CreateEventModal] Created event:', event.id);
      }

      onEventCreated();
    } catch (err) {
      console.error('[DBG][CreateEventModal] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <ModalHeader title="Create Event" onClose={onClose} />

      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-4">
          {/* Event Type Toggle */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-body)' }}>
              Event Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEventType('general')}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border:
                    eventType === 'general'
                      ? '2px solid var(--color-primary)'
                      : '1px solid var(--color-border)',
                  backgroundColor: eventType === 'general' ? 'rgba(163, 86, 56, 0.1)' : 'white',
                  color: eventType === 'general' ? 'var(--color-primary)' : 'var(--text-body)',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                General Event
              </button>
              <button
                type="button"
                onClick={() => setEventType('live_session')}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border:
                    eventType === 'live_session'
                      ? '2px solid var(--color-highlight)'
                      : '1px solid var(--color-border)',
                  backgroundColor:
                    eventType === 'live_session' ? 'rgba(125, 142, 116, 0.1)' : 'white',
                  color:
                    eventType === 'live_session' ? 'var(--color-highlight)' : 'var(--text-body)',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Live Session
              </button>
            </div>
          </div>

          {/* Live Session: Webinar Title */}
          {eventType === 'live_session' && (
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-body)' }}
              >
                Webinar Title
              </label>
              <input
                type="text"
                value={webinarTitle}
                onChange={e => setWebinarTitle(e.target.value)}
                placeholder="e.g., Morning Yoga Series"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  fontSize: '14px',
                }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                This creates a new webinar with this session
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>
              {eventType === 'live_session' ? 'Session Title' : 'Event Title'} *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={
                eventType === 'live_session' ? 'e.g., Session 1: Basics' : 'e.g., Team Meeting'
              }
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add details about this event..."
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

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-body)' }}
              >
                Start *
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={e => handleStartTimeChange(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  fontSize: '14px',
                }}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-body)' }}
              >
                End *
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {/* All Day (general events only) */}
          {eventType === 'general' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAllDay"
                checked={isAllDay}
                onChange={e => setIsAllDay(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <label htmlFor="isAllDay" className="text-sm" style={{ color: 'var(--text-body)' }}>
                All day event
              </label>
            </div>
          )}

          {/* Location (general events only) */}
          {eventType === 'general' && (
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-body)' }}
              >
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g., Zoom, Office, etc."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  fontSize: '14px',
                }}
              />
            </div>
          )}

          {/* Color (general events only) */}
          {eventType === 'general' && (
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-body)' }}
              >
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {EVENT_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: c.value,
                      border:
                        color === c.value ? '3px solid var(--text-main)' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Notes (general events only) */}
          {eventType === 'general' && (
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-body)' }}
              >
                Notes
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Private notes..."
                rows={2}
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
          <SecondaryButton type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Creating...'
              : eventType === 'live_session'
                ? 'Create Live Session'
                : 'Create Event'}
          </PrimaryButton>
        </ModalFooter>
      </form>
    </Modal>
  );
}
