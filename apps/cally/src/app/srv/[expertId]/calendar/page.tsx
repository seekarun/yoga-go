"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DatesSetArg } from "@fullcalendar/core";
import type { CalendarItem } from "@/types";
import type { WeeklySchedule } from "@/types/booking";
import { DEFAULT_BOOKING_CONFIG } from "@/types/booking";
import LoadingSpinner from "@/components/LoadingSpinner";
import CreateEventModal from "@/components/calendar/CreateEventModal";
import CalendarEventModal from "@/components/calendar/CalendarEventModal";
import "@/styles/calendar.css";

export default function CalendarPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const calendarRef = useRef<FullCalendar>(null);

  const [events, setEvents] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreatingInstantMeeting, setIsCreatingInstantMeeting] =
    useState(false);
  const [videoCallPreference, setVideoCallPreference] = useState<
    "cally" | "google_meet" | "zoom"
  >("cally");
  const [defaultEventDuration, setDefaultEventDuration] = useState(30);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(
    DEFAULT_BOOKING_CONFIG.weeklySchedule,
  );

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalDate, setCreateModalDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null);

  // Current date range for fetching
  const [dateRange, setDateRange] = useState<{
    start: string;
    end: string;
  } | null>(null);

  // Fetch video call preference
  useEffect(() => {
    async function fetchPreference() {
      try {
        const res = await fetch("/api/data/app/preferences");
        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.videoCallPreference) {
            setVideoCallPreference(data.data.videoCallPreference);
          }
          if (data.data.defaultEventDuration) {
            setDefaultEventDuration(data.data.defaultEventDuration);
          }
          if (data.data.weeklySchedule) {
            setWeeklySchedule(data.data.weeklySchedule);
          }
        }
      } catch (err) {
        console.error("[DBG][calendar-page] Failed to fetch preferences:", err);
      }
    }
    fetchPreference();
  }, []);

  // Fetch calendar events
  const fetchEvents = useCallback(async (start: string, end: string) => {
    console.log("[DBG][calendar-page] Fetching events:", start, "to", end);
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/data/app/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      );
      const data = await response.json();

      if (data.success) {
        setEvents(data.data || []);
        console.log(
          "[DBG][calendar-page] Loaded",
          (data.data || []).length,
          "events",
        );
      } else {
        setError(data.error || "Failed to load calendar");
      }
    } catch (err) {
      console.error("[DBG][calendar-page] Error:", err);
      setError("Failed to load calendar");
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
    [dateRange, fetchEvents],
  );

  // Placeholder event shown while create modal is open
  const [placeholderEvent, setPlaceholderEvent] = useState<{
    start: string;
    end: string;
  } | null>(null);

  // Handle selecting a time range on the calendar
  const handleSelect = useCallback(
    (arg: { start: Date; end: Date; allDay: boolean }) => {
      console.log("[DBG][calendar-page] Date selected:", arg.start);
      // For all-day (month view click), default to 9am–10am
      let start = arg.start;
      let end = arg.end;
      if (arg.allDay) {
        start = new Date(arg.start);
        start.setHours(9, 0, 0, 0);
        end = new Date(start);
        end.setHours(10, 0, 0, 0);
      }
      setPlaceholderEvent({
        start: start.toISOString(),
        end: end.toISOString(),
      });
      setCreateModalDate(arg.start);
      setIsCreateModalOpen(true);
      // Unselect the FullCalendar highlight
      calendarRef.current?.getApi().unselect();
    },
    [],
  );

  // Handle clicking on existing event
  const handleEventClick = useCallback((arg: EventClickArg) => {
    // Ignore clicks on the placeholder event
    if (arg.event.id === "__placeholder__") return;

    console.log("[DBG][calendar-page] Event clicked:", arg.event.id);

    const eventApi = arg.event;
    const calendarItem: CalendarItem = {
      id: eventApi.id,
      title: eventApi.title,
      start: eventApi.startStr,
      end: eventApi.endStr,
      allDay: eventApi.allDay,
      type: "event",
      color: eventApi.backgroundColor || undefined,
      extendedProps: eventApi.extendedProps,
    };

    setSelectedEvent(calendarItem);
  }, []);

  // Handle event creation
  const handleEventCreated = useCallback(() => {
    setIsCreateModalOpen(false);
    setCreateModalDate(null);
    setPlaceholderEvent(null);

    // Refetch events
    if (dateRange) {
      fetchEvents(dateRange.start, dateRange.end);
    }
  }, [dateRange, fetchEvents]);

  // Handle create modal close/cancel
  const handleCreateModalClose = useCallback(() => {
    setIsCreateModalOpen(false);
    setCreateModalDate(null);
    setPlaceholderEvent(null);
  }, []);

  // Handle event update/delete
  const handleEventUpdated = useCallback(() => {
    setSelectedEvent(null);

    // Refetch events
    if (dateRange) {
      fetchEvents(dateRange.start, dateRange.end);
    }
  }, [dateRange, fetchEvents]);

  // Handle instant meeting creation
  const handleInstantMeeting = useCallback(async () => {
    setIsCreatingInstantMeeting(true);
    setError("");

    try {
      const response = await fetch("/api/data/app/calendar/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: defaultEventDuration }),
      });

      const data = await response.json();

      if (data.success) {
        console.log(
          "[DBG][calendar-page] Instant meeting created:",
          data.data.event.id,
        );
        // Redirect to the live page
        router.push(`/srv/${expertId}/live/${data.data.event.id}`);
      } else {
        setError(data.error || "Failed to create instant meeting");
        setIsCreatingInstantMeeting(false);
      }
    } catch (err) {
      console.error("[DBG][calendar-page] Instant meeting error:", err);
      setError("Failed to create instant meeting");
      setIsCreatingInstantMeeting(false);
    }
  }, [expertId, router, defaultEventDuration]);

  // Transform CalendarItem to FullCalendar event format
  const fullCalendarEvents: Record<string, unknown>[] = events.map((event) => {
    const source = event.extendedProps?.source;
    const isExternal =
      source === "google_calendar" || source === "outlook_calendar";

    if (isExternal) {
      return {
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        backgroundColor: "#ffffff",
        borderColor: source === "google_calendar" ? "#4285F4" : "#0078D4",
        textColor: "#6b7280",
        extendedProps: event.extendedProps,
      };
    }

    return {
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      backgroundColor: event.color,
      borderColor: event.color,
      extendedProps: event.extendedProps,
    };
  });

  // Convert weeklySchedule to FullCalendar businessHours format
  const businessHours = useMemo(
    () =>
      Object.entries(weeklySchedule)
        .filter(([, day]) => day.enabled)
        .map(([dow, day]) => ({
          daysOfWeek: [Number(dow)],
          startTime: `${String(day.startHour).padStart(2, "0")}:00`,
          endTime: `${String(day.endHour).padStart(2, "0")}:00`,
        })),
    [weeklySchedule],
  );

  // Add placeholder event while create modal is open
  if (placeholderEvent) {
    fullCalendarEvents.push({
      id: "__placeholder__",
      title: "(New Event)",
      start: placeholderEvent.start,
      end: placeholderEvent.end,
      allDay: false,
      classNames: ["fc-event-placeholder"],
      backgroundColor: "transparent",
      borderColor: "transparent",
      editable: false,
      display: "block",
    });
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main,#111827)]">
            Calendar
          </h1>
          <p className="text-[var(--text-muted,#6b7280)] mt-1">
            Manage your schedule and appointments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleInstantMeeting}
            disabled={isCreatingInstantMeeting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingInstantMeeting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Starting...
              </>
            ) : (
              <>
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
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Instant Meeting
              </>
            )}
          </button>
          <button
            onClick={() => {
              setCreateModalDate(new Date());
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary,#6366f1)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--color-primary-hover,#4f46e5)] transition-colors"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Event
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* Calendar Container */}
      <div
        className="calendar-container bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border,#e5e7eb)] relative"
        style={{ minHeight: "700px" }}
      >
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex justify-center items-center z-10 rounded-xl">
            <LoadingSpinner size="lg" />
          </div>
        )}
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={fullCalendarEvents}
          datesSet={handleDatesSet}
          select={handleSelect}
          eventClick={handleEventClick}
          editable={false}
          selectable={true}
          selectMirror={false}
          unselectAuto={false}
          dayMaxEvents={3}
          weekends={true}
          nowIndicator={true}
          height="auto"
          eventTimeFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: "short",
          }}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          businessHours={businessHours}
          eventDisplay="block"
        />
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={handleCreateModalClose}
        initialDate={createModalDate}
        tenantId={expertId}
        onEventCreated={handleEventCreated}
        videoCallPreference={videoCallPreference}
        defaultDurationMinutes={defaultEventDuration}
      />

      {/* View/Edit Event Modal */}
      <CalendarEventModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
        tenantId={expertId}
        onEventUpdated={handleEventUpdated}
      />
    </div>
  );
}
