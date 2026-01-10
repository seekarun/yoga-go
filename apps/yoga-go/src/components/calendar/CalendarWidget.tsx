'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { CalendarItem } from '@/types';

interface CalendarWidgetProps {
  expertId: string;
}

// Simple mini calendar for month view
function MiniCalendar({
  currentDate,
  events,
  onDateChange,
}: {
  currentDate: Date;
  events: CalendarItem[];
  onDateChange: (date: Date) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Get dates with events
  const eventDates = new Set(events.map(e => new Date(e.start).toDateString()));

  // Navigate months
  const prevMonth = () => {
    onDateChange(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    onDateChange(new Date(year, month + 1, 1));
  };

  // Day names
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Generate calendar days
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const hasEvent = (day: number) => {
    const dateStr = new Date(year, month, day).toDateString();
    return eventDates.has(dateStr);
  };

  return (
    <div>
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-gray-100"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-gray-100"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((name, i) => (
          <div
            key={i}
            className="text-center text-xs font-medium py-1"
            style={{ color: 'var(--text-muted)' }}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => (
          <div key={i} className="aspect-square flex items-center justify-center relative">
            {day && (
              <span
                className="w-7 h-7 flex items-center justify-center rounded-full text-xs"
                style={{
                  backgroundColor: isToday(day) ? 'var(--color-primary)' : 'transparent',
                  color: isToday(day) ? 'white' : 'var(--text-body)',
                  fontWeight: isToday(day) ? '600' : '400',
                }}
              >
                {day}
                {hasEvent(day) && !isToday(day) && (
                  <span
                    className="absolute bottom-0 w-1 h-1 rounded-full"
                    style={{ backgroundColor: 'var(--color-highlight)' }}
                  />
                )}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatEventTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatEventDate(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CalendarWidget({ expertId }: CalendarWidgetProps) {
  const [events, setEvents] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch upcoming events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Get events for current month + next month
        const start = new Date();
        start.setDate(1);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 2);
        end.setDate(0);

        const response = await fetch(
          `/data/app/expert/me/calendar?start=${start.toISOString()}&end=${end.toISOString()}`
        );
        const data = await response.json();

        if (data.success) {
          setEvents(data.data || []);
        }
      } catch (err) {
        console.error('[DBG][CalendarWidget] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Get upcoming events (next 7 days)
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const upcomingEvents = events
    .filter(e => {
      const eventDate = new Date(e.start);
      return eventDate >= now && eventDate <= nextWeek;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ color: 'var(--text-main)' }}>
          Calendar
        </h3>
        <Link
          href={`/srv/${expertId}/calendar`}
          className="text-sm hover:underline"
          style={{ color: 'var(--color-primary)' }}
        >
          View all
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: 'var(--color-border)',
              borderTopColor: 'var(--color-primary)',
            }}
          />
        </div>
      ) : (
        <>
          {/* Mini Calendar */}
          <MiniCalendar currentDate={currentDate} events={events} onDateChange={setCurrentDate} />

          {/* Upcoming Events */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
              Upcoming
            </h4>

            {upcomingEvents.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No upcoming events
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="flex items-start gap-3">
                    {/* Color indicator */}
                    <div
                      className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          event.type === 'live_session'
                            ? 'var(--color-highlight)'
                            : event.color || 'var(--color-primary)',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--text-main)' }}
                      >
                        {event.title}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatEventDate(event.start)} at {formatEventTime(event.start)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Create */}
          <Link
            href={`/srv/${expertId}/calendar`}
            className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-main)',
              color: 'var(--color-primary)',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Event
          </Link>
        </>
      )}
    </div>
  );
}
