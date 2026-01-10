'use client';

import { useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DateClickArg, DatesSetArg } from '@fullcalendar/core';
import type { CalendarItem } from '@/types';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import CalendarEventModal from '@/components/calendar/CalendarEventModal';
import '@/styles/calendar.css';

export default function CalendarPage() {
  const params = useParams();
  const expertId = params.expertId as string;
  const calendarRef = useRef<FullCalendar>(null);

  const [events, setEvents] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalDate, setCreateModalDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null);

  // Current date range for fetching
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  // Fetch calendar events
  const fetchEvents = useCallback(async (start: string, end: string) => {
    console.log('[DBG][calendar-page] Fetching events:', start, 'to', end);
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/data/app/expert/me/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      );
      const data = await response.json();

      if (data.success) {
        setEvents(data.data || []);
        console.log('[DBG][calendar-page] Loaded', (data.data || []).length, 'events');
      } else {
        setError(data.error || 'Failed to load calendar');
      }
    } catch (err) {
      console.error('[DBG][calendar-page] Error:', err);
      setError('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle date range changes from FullCalendar
  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const start = arg.start.toISOString();
      const end = arg.end.toISOString();

      // Only fetch if range changed
      if (!dateRange || dateRange.start !== start || dateRange.end !== end) {
        setDateRange({ start, end });
        fetchEvents(start, end);
      }
    },
    [dateRange, fetchEvents]
  );

  // Handle clicking on empty date
  const handleDateClick = useCallback((arg: DateClickArg) => {
    console.log('[DBG][calendar-page] Date clicked:', arg.date);
    setCreateModalDate(arg.date);
    setIsCreateModalOpen(true);
  }, []);

  // Handle clicking on existing event
  const handleEventClick = useCallback((arg: EventClickArg) => {
    console.log('[DBG][calendar-page] Event clicked:', arg.event.id);

    const eventApi = arg.event;
    const calendarItem: CalendarItem = {
      id: eventApi.id,
      title: eventApi.title,
      start: eventApi.startStr,
      end: eventApi.endStr,
      allDay: eventApi.allDay,
      type: eventApi.extendedProps.webinarId ? 'live_session' : 'event',
      color: eventApi.backgroundColor || undefined,
      extendedProps: {
        description: eventApi.extendedProps.description,
        webinarId: eventApi.extendedProps.webinarId,
        sessionId: eventApi.extendedProps.sessionId,
        meetingLink: eventApi.extendedProps.meetingLink,
        location: eventApi.extendedProps.location,
        status: eventApi.extendedProps.status,
      },
    };

    setSelectedEvent(calendarItem);
  }, []);

  // Handle event creation
  const handleEventCreated = useCallback(() => {
    setIsCreateModalOpen(false);
    setCreateModalDate(null);

    // Refetch events
    if (dateRange) {
      fetchEvents(dateRange.start, dateRange.end);
    }
  }, [dateRange, fetchEvents]);

  // Handle event update/delete
  const handleEventUpdated = useCallback(() => {
    setSelectedEvent(null);

    // Refetch events
    if (dateRange) {
      fetchEvents(dateRange.start, dateRange.end);
    }
  }, [dateRange, fetchEvents]);

  // Transform CalendarItem to FullCalendar event format
  const fullCalendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    backgroundColor: event.color,
    borderColor: event.color,
    classNames: [event.type === 'live_session' ? 'fc-event-live-session' : 'fc-event-general'],
    extendedProps: event.extendedProps,
  }));

  return (
    <div className="px-6 lg:px-8 py-6">
      <DashboardHeader title="Calendar" subtitle="Manage your schedule and live sessions">
        <button
          onClick={() => {
            setCreateModalDate(new Date());
            setIsCreateModalOpen(true);
          }}
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Event
        </button>
      </DashboardHeader>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      <div
        className="calendar-container"
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          minHeight: '700px',
        }}
      >
        {loading && events.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner />
          </div>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            events={fullCalendarEvents}
            datesSet={handleDatesSet}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            editable={false}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={3}
            weekends={true}
            nowIndicator={true}
            height="auto"
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short',
            }}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            eventDisplay="block"
          />
        )}
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateModalDate(null);
        }}
        initialDate={createModalDate}
        expertId={expertId}
        onEventCreated={handleEventCreated}
      />

      {/* View/Edit Event Modal */}
      <CalendarEventModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
        expertId={expertId}
        onEventUpdated={handleEventUpdated}
      />
    </div>
  );
}
