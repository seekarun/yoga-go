"use client";

/**
 * Dashboard Page
 *
 * Calendar interface with columnar navigation:
 * Month → Date → Day → Event
 *
 * Desktop: Shows 2 columns (50% each)
 * Mobile: Shows 1 column
 *
 * Animated transitions between views.
 * Supports natural language commands for all calendar actions.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { format, getDay, getYear, startOfYear, parseISO } from "date-fns";
import {
  CalendarCarousel,
  CarouselColumn,
  useCarousel,
  YearView,
  MonthView,
  DateView,
  DayView,
  EventView,
  ChatInput,
  EventCandidates,
  QueryResults,
  type TimeSlot,
  type CalendarEvent,
  type EventFormData,
  type PreviewEvent,
} from "@/components/calendar";
import { Sidebar } from "@/components/layout";
import type {
  ParsedCommand,
  EventSummary,
  EventPrefill,
  CandidateSelection,
  QueryResultsData,
} from "@/types";
import {
  findNextAvailableSlot,
  formatFoundSlot,
  type AvailabilityRule as FindAvailRule,
} from "@/lib/findAvailability";

interface User {
  email: string;
  sub: string;
  tenantId?: string;
  tenantName?: string;
}

interface ChatMessage {
  id: string;
  type: "user" | "system";
  content: string;
  timestamp: Date;
}

interface AvailabilityRule {
  type: "weekly" | "date-specific";
  days?: number[];
  date?: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

// Inner component that uses carousel context
function CalendarContent({
  selectedDate,
  setSelectedDate,
  selectedYear,
  events,
  slots,
  selectedTime,
  setSelectedTime,
  selectedEvent,
  setSelectedEvent,
  prefillEventData,
  previewEvent,
  onSaveEvent,
  onDeleteEvent,
  onEventFormChange,
}: {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  selectedYear: number;
  events: CalendarEvent[];
  slots: TimeSlot[];
  selectedTime: string;
  setSelectedTime: (time: string) => void;
  selectedEvent: CalendarEvent | null;
  setSelectedEvent: (event: CalendarEvent | null) => void;
  prefillEventData: EventPrefill | null;
  previewEvent: PreviewEvent | null;
  onSaveEvent: (event: Omit<CalendarEvent, "id">) => void;
  onDeleteEvent: (eventId: string) => void;
  onEventFormChange: (data: EventFormData) => void;
}) {
  const { navigateTo, navigateRight, isRightColumn } = useCarousel();

  // Navigate to event view when prefillData is set (from NL command)
  useEffect(() => {
    if (prefillEventData && !selectedEvent) {
      // Creating new event - navigate to day view which shows day + event columns
      navigateTo("day");
    } else if (prefillEventData && selectedEvent) {
      // Editing existing event - also navigate to day view
      navigateTo("day");
    }
  }, [prefillEventData, selectedEvent, navigateTo]);

  // Handle year selection - updates selectedDate to January 1st of that year
  // This will automatically update selectedYear since it's derived from selectedDate
  const handleYearSelect = (year: number) => {
    setSelectedDate(startOfYear(new Date(year, 0, 1)));
  };

  // Handle date selection from month view (only navigate if in right column)
  const handleMonthDateSelect = (date: Date) => {
    setSelectedDate(date);
    if (isRightColumn("month")) {
      navigateRight();
    }
  };

  // Handle date selection from date view (only navigate if in right column)
  const handleDateViewSelect = (date: Date) => {
    setSelectedDate(date);
    if (isRightColumn("date")) {
      navigateRight();
    }
  };

  // Handle slot click in day view (only navigate if in right column)
  const handleSlotClick = (time: string, clickedDate: Date) => {
    setSelectedTime(time);
    setSelectedDate(clickedDate);
    setSelectedEvent(null);
    if (isRightColumn("day")) {
      navigateTo("day"); // Show day+event columns
    }
  };

  // Handle event click in day view (only navigate if in right column)
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedTime(event.startTime);
    if (isRightColumn("day")) {
      navigateTo("day"); // Show day+event columns
    }
  };

  return (
    <>
      {/* Year View Column */}
      <CarouselColumn view="year" title="Year">
        <YearView selectedYear={selectedYear} onYearSelect={handleYearSelect} />
      </CarouselColumn>

      {/* Month View Column */}
      <CarouselColumn view="month" title="Calendar" showBackButton>
        <MonthView
          selectedDate={selectedDate}
          onDateSelect={handleMonthDateSelect}
          events={events}
        />
      </CarouselColumn>

      {/* Date View Column */}
      <CarouselColumn view="date" title="Dates" showBackButton>
        <DateView
          selectedDate={selectedDate}
          onDateSelect={handleDateViewSelect}
          events={events}
        />
      </CarouselColumn>

      {/* Day View Column */}
      <CarouselColumn
        view="day"
        title={format(selectedDate, "EEE, MMM d")}
        showBackButton
      >
        <DayView
          date={selectedDate}
          slots={slots}
          events={events}
          previewEvent={previewEvent}
          scrollToTime={prefillEventData ? selectedTime : undefined}
          onSlotClick={handleSlotClick}
          onEventClick={handleEventClick}
          onDateChange={setSelectedDate}
        />
      </CarouselColumn>

      {/* Event View Column */}
      <CarouselColumn
        view="event"
        title={selectedEvent ? "Edit Event" : "New Event"}
        showBackButton
      >
        <EventView
          date={selectedDate}
          initialTime={selectedTime}
          event={selectedEvent}
          prefillData={prefillEventData}
          onSave={onSaveEvent}
          onDelete={onDeleteEvent}
          onChange={onEventFormChange}
        />
      </CarouselColumn>
    </>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<
    AvailabilityRule[]
  >([
    {
      type: "weekly",
      days: [1, 2, 3, 4, 5],
      startTime: "09:00",
      endTime: "17:00",
      available: true,
    },
  ]);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );

  // NL command handling state
  const [prefillEventData, setPrefillEventData] = useState<EventPrefill | null>(
    null,
  );
  const [previewEvent, setPreviewEvent] = useState<PreviewEvent | null>(null);
  const [candidateSelection, setCandidateSelection] =
    useState<CandidateSelection | null>(null);
  const [queryResults, setQueryResults] = useState<QueryResultsData | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<EventSummary | null>(null);

  // Ref to carousel for programmatic navigation
  const carouselRef = useRef<{ navigateTo: (view: string) => void } | null>(
    null,
  );

  // Derive selectedYear from selectedDate to keep all views in sync
  const selectedYear = getYear(selectedDate);

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      const response = await fetch("/data/app/events");
      const data = await response.json();
      if (data.success) {
        console.log("[DBG][dashboard] Fetched", data.data.length, "events");
        setEvents(data.data);
      }
    } catch (error) {
      console.error("[DBG][dashboard] Failed to fetch events:", error);
    }
  };

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();

        if (!data.success || !data.data?.isAuthenticated) {
          router.push("/auth/signin");
          return;
        }

        setUser(data.data.user);
        await fetchEvents();
      } catch (error) {
        console.error("[DBG][dashboard] Session check failed:", error);
        router.push("/auth/signin");
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, [router]);

  // Calculate time slots based on availability rules
  const calculateSlots = useCallback(
    (date: Date): TimeSlot[] => {
      const slots: TimeSlot[] = [];
      const dayOfWeek = getDay(date);
      const dateStr = format(date, "yyyy-MM-dd");

      for (let hour = 0; hour < 24; hour++) {
        for (const minute of [0, 30]) {
          const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
          let status: TimeSlot["status"] = "unavailable";

          for (const rule of availabilityRules) {
            if (rule.type === "weekly" && rule.days?.includes(dayOfWeek)) {
              if (time >= rule.startTime && time < rule.endTime) {
                status = rule.available ? "available" : "unavailable";
              }
            } else if (rule.type === "date-specific" && rule.date === dateStr) {
              if (time >= rule.startTime && time < rule.endTime) {
                status = rule.available ? "available" : "unavailable";
              }
            }
          }

          slots.push({ time, status });
        }
      }

      return slots;
    },
    [availabilityRules],
  );

  const [slots, setSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    setSlots(calculateSlots(selectedDate));
  }, [selectedDate, calculateSlots]);

  // Convert events to summaries for API
  const getEventSummaries = useCallback((): EventSummary[] => {
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
    }));
  }, [events]);

  // Find events matching search criteria
  const findMatchingEvents = useCallback(
    (searchQuery?: string, date?: string, time?: string): CalendarEvent[] => {
      return events.filter((e) => {
        let matches = true;

        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          matches = e.title.toLowerCase().includes(query);
        }

        if (date && matches) {
          matches = e.date === date;
        }

        if (time && matches) {
          // Check if event overlaps with the specified time
          matches = e.startTime <= time && e.endTime > time;
        }

        return matches;
      });
    },
    [events],
  );

  // Add system message to chat
  const addSystemMessage = (content: string) => {
    const systemMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: "system",
      content,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, systemMessage]);
  };

  // Handle create_event command
  const handleCreateEventCommand = (parsed: ParsedCommand) => {
    if (!parsed.event) {
      addSystemMessage(
        "I couldn't understand the event details. Please try again.",
      );
      return;
    }

    const { title, date, startTime, endTime, description } = parsed.event;

    // Set prefill data
    setPrefillEventData({
      title: title || undefined,
      description: description || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
    });

    // Navigate to the appropriate date
    if (date) {
      setSelectedDate(parseISO(date));
    }

    if (startTime) {
      setSelectedTime(startTime);
    }

    // Clear any selected event (we're creating new)
    setSelectedEvent(null);

    addSystemMessage(parsed.message);
  };

  // Handle update_event command
  const handleUpdateEventCommand = (parsed: ParsedCommand) => {
    const { targetEvent, event: updates } = parsed;

    if (!targetEvent) {
      addSystemMessage(
        "I couldn't identify which event to update. Please try again.",
      );
      return;
    }

    // If we have a matched event ID, use it directly
    if (targetEvent.matchedEventId) {
      const foundEvent = events.find(
        (e) => e.id === targetEvent.matchedEventId,
      );
      if (foundEvent) {
        setSelectedEvent(foundEvent);
        if (updates?.date) {
          setSelectedDate(parseISO(updates.date));
        } else {
          setSelectedDate(parseISO(foundEvent.date));
        }
        // Set prefill with updates
        setPrefillEventData({
          title: updates?.title || foundEvent.title,
          startTime: updates?.startTime || foundEvent.startTime,
          endTime: updates?.endTime || foundEvent.endTime,
          description: updates?.description || foundEvent.description,
        });
        addSystemMessage(parsed.message);
        return;
      }
    }

    // Search for matching events
    const matches = findMatchingEvents(
      targetEvent.searchQuery,
      targetEvent.date,
      targetEvent.time,
    );

    if (matches.length === 0) {
      addSystemMessage(
        `I couldn't find any events matching "${targetEvent.searchQuery || "your description"}". Try being more specific.`,
      );
      return;
    }

    if (matches.length === 1) {
      // Single match - proceed with update
      const foundEvent = matches[0];
      setSelectedEvent(foundEvent);
      if (updates?.date) {
        setSelectedDate(parseISO(updates.date));
      } else {
        setSelectedDate(parseISO(foundEvent.date));
      }
      setPrefillEventData({
        title: updates?.title || foundEvent.title,
        startTime: updates?.startTime || foundEvent.startTime,
        endTime: updates?.endTime || foundEvent.endTime,
        description: updates?.description || foundEvent.description,
      });
      addSystemMessage(parsed.message);
    } else {
      // Multiple matches - show disambiguation
      setCandidateSelection({
        events: matches.map((e) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
        })),
        action: "update",
        pendingCommand: parsed,
      });
      addSystemMessage(
        "Multiple events match. Please select which one to update.",
      );
    }
  };

  // Handle delete_event command
  const handleDeleteEventCommand = (parsed: ParsedCommand) => {
    const { targetEvent } = parsed;

    if (!targetEvent) {
      addSystemMessage(
        "I couldn't identify which event to delete. Please try again.",
      );
      return;
    }

    // If we have a matched event ID, use it directly
    if (targetEvent.matchedEventId) {
      const foundEvent = events.find(
        (e) => e.id === targetEvent.matchedEventId,
      );
      if (foundEvent) {
        setPendingDelete({
          id: foundEvent.id,
          title: foundEvent.title,
          date: foundEvent.date,
          startTime: foundEvent.startTime,
          endTime: foundEvent.endTime,
        });
        addSystemMessage(
          `Delete "${foundEvent.title}" on ${format(parseISO(foundEvent.date), "MMM d")} at ${foundEvent.startTime}? Click to confirm.`,
        );
        return;
      }
    }

    // Search for matching events
    const matches = findMatchingEvents(
      targetEvent.searchQuery,
      targetEvent.date,
      targetEvent.time,
    );

    if (matches.length === 0) {
      addSystemMessage(
        `I couldn't find any events matching "${targetEvent.searchQuery || "your description"}". Try being more specific.`,
      );
      return;
    }

    if (matches.length === 1) {
      // Single match - show confirmation
      const foundEvent = matches[0];
      setPendingDelete({
        id: foundEvent.id,
        title: foundEvent.title,
        date: foundEvent.date,
        startTime: foundEvent.startTime,
        endTime: foundEvent.endTime,
      });
      addSystemMessage(
        `Delete "${foundEvent.title}" on ${format(parseISO(foundEvent.date), "MMM d")} at ${foundEvent.startTime}? Click to confirm.`,
      );
    } else {
      // Multiple matches - show disambiguation
      setCandidateSelection({
        events: matches.map((e) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
        })),
        action: "delete",
        pendingCommand: parsed,
      });
      addSystemMessage(
        "Multiple events match. Please select which one to delete.",
      );
    }
  };

  // Handle find_availability command
  const handleFindAvailabilityCommand = (parsed: ParsedCommand) => {
    const { findSlot } = parsed;

    if (!findSlot) {
      addSystemMessage("I couldn't understand the duration. Please try again.");
      return;
    }

    // Convert availability rules and events to the format expected by findNextAvailableSlot
    const rules: FindAvailRule[] = availabilityRules;
    const eventSlots = events.map((e) => ({
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
    }));

    const slot = findNextAvailableSlot(
      findSlot.duration_minutes,
      rules,
      eventSlots,
      new Date(),
    );

    if (slot) {
      const formattedSlot = formatFoundSlot(slot);
      addSystemMessage(
        `Next available ${findSlot.duration_minutes}-minute slot: ${formattedSlot}. Say "book it" to create an event.`,
      );

      // Pre-fill for if user wants to book
      setPrefillEventData({
        title: findSlot.purpose || undefined,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      setSelectedDate(parseISO(slot.date));
      setSelectedTime(slot.startTime);
    } else {
      addSystemMessage(
        "I couldn't find an available slot in the next 2 weeks. Try adjusting your availability settings.",
      );
    }
  };

  // Handle query_event command
  const handleQueryEventCommand = (parsed: ParsedCommand) => {
    const { query } = parsed;

    if (!query) {
      addSystemMessage(
        "I couldn't understand what you're looking for. Please try again.",
      );
      return;
    }

    let filteredEvents: CalendarEvent[] = [];
    let dateLabel = "";

    if (query.date) {
      // Single date query
      filteredEvents = events.filter((e) => e.date === query.date);
      dateLabel = format(parseISO(query.date), "EEEE, MMMM d");
    } else if (query.dateRange) {
      // Date range query
      filteredEvents = events.filter(
        (e) =>
          e.date >= query.dateRange!.start && e.date <= query.dateRange!.end,
      );
      dateLabel = `${format(parseISO(query.dateRange.start), "MMM d")} - ${format(parseISO(query.dateRange.end), "MMM d")}`;
    } else if (query.searchTerm) {
      // Search by term
      const term = query.searchTerm.toLowerCase();
      filteredEvents = events.filter((e) =>
        e.title.toLowerCase().includes(term),
      );
      dateLabel = `Results for "${query.searchTerm}"`;
    }

    if (filteredEvents.length === 0) {
      addSystemMessage(parsed.message + " No events found.");
      setQueryResults(null);
    } else {
      setQueryResults({
        events: filteredEvents.map((e) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
        })),
        label: dateLabel,
      });
      addSystemMessage(parsed.message);
    }
  };

  // Handle set_availability command (existing logic)
  const handleSetAvailabilityCommand = (parsed: ParsedCommand) => {
    const { availability } = parsed;

    if (!availability) {
      addSystemMessage(
        "I couldn't understand the availability settings. Please try again.",
      );
      return;
    }

    let newRules: AvailabilityRule[] = [...availabilityRules];

    switch (availability.action) {
      case "set":
        newRules = availability.rules;
        break;
      case "add":
        newRules = [...availabilityRules, ...availability.rules];
        break;
      case "clear":
        newRules = [];
        break;
    }

    setAvailabilityRules(newRules);
    addSystemMessage(parsed.message);
  };

  // Main command processor
  const processCommand = async (command: string) => {
    setIsProcessing(true);

    // Clear previous UI state
    setCandidateSelection(null);
    setQueryResults(null);
    setPendingDelete(null);
    setPrefillEventData(null);
    setPreviewEvent(null);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: command,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);

    try {
      const apiResponse = await fetch("/api/parse-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          currentDate: format(new Date(), "yyyy-MM-dd"),
          currentTime: format(new Date(), "HH:mm"),
          existingEvents: getEventSummaries(),
        }),
      });

      const result = await apiResponse.json();

      if (!result.success) {
        addSystemMessage(
          "Sorry, I had trouble processing that. Please try again later.",
        );
        setIsProcessing(false);
        return;
      }

      const parsed: ParsedCommand = result.data;
      console.log("[DBG][dashboard] Parsed command:", parsed.action);

      switch (parsed.action) {
        case "create_event":
          handleCreateEventCommand(parsed);
          break;
        case "update_event":
          handleUpdateEventCommand(parsed);
          break;
        case "delete_event":
          handleDeleteEventCommand(parsed);
          break;
        case "find_availability":
          handleFindAvailabilityCommand(parsed);
          break;
        case "query_event":
          handleQueryEventCommand(parsed);
          break;
        case "set_availability":
          handleSetAvailabilityCommand(parsed);
          break;
        default:
          addSystemMessage(parsed.message);
      }
    } catch (error) {
      console.error("[DBG][dashboard] Command processing error:", error);
      addSystemMessage("Sorry, I had trouble understanding that.");
    }

    setIsProcessing(false);
  };

  // Handle candidate selection from disambiguation UI
  const handleCandidateSelect = (event: EventSummary) => {
    if (!candidateSelection) return;

    const fullEvent = events.find((e) => e.id === event.id);
    if (!fullEvent) return;

    if (candidateSelection.action === "update") {
      const updates = candidateSelection.pendingCommand.event;
      setSelectedEvent(fullEvent);
      if (updates?.date) {
        setSelectedDate(parseISO(updates.date));
      } else {
        setSelectedDate(parseISO(fullEvent.date));
      }
      setPrefillEventData({
        title: updates?.title || fullEvent.title,
        startTime: updates?.startTime || fullEvent.startTime,
        endTime: updates?.endTime || fullEvent.endTime,
        description: updates?.description || fullEvent.description,
      });
    } else if (candidateSelection.action === "delete") {
      setPendingDelete(event);
    }

    setCandidateSelection(null);
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    await handleDeleteEvent(pendingDelete.id);
    setPendingDelete(null);
    addSystemMessage(`Deleted "${pendingDelete.title}".`);
  };

  // Handle query result click
  const handleQueryEventClick = (event: EventSummary) => {
    const fullEvent = events.find((e) => e.id === event.id);
    if (fullEvent) {
      setSelectedDate(parseISO(fullEvent.date));
      setSelectedEvent(fullEvent);
      setQueryResults(null);
    }
  };

  // Handle form changes from EventView for preview
  const handleEventFormChange = useCallback(
    (data: EventFormData) => {
      // Only show preview when creating new event (not editing)
      if (!selectedEvent) {
        setPreviewEvent({
          title: data.title,
          startTime: data.startTime,
          endTime: data.endTime,
        });
      }
    },
    [selectedEvent],
  );

  const handleSaveEvent = async (eventData: Omit<CalendarEvent, "id">) => {
    console.log("[DBG][dashboard] Saving event:", eventData);

    try {
      const response = await fetch("/data/app/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      const data = await response.json();

      if (data.success) {
        console.log("[DBG][dashboard] Event saved:", data.data.id);
        await fetchEvents();
        setSelectedEvent(null);
        setPreviewEvent(null); // Clear preview after saving
        setPrefillEventData(null); // Clear prefill data
      }
    } catch (error) {
      console.error("[DBG][dashboard] Error saving event:", error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    console.log("[DBG][dashboard] Deleting event:", eventId);

    try {
      const response = await fetch(`/data/app/events/${eventId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        console.log("[DBG][dashboard] Event deleted");
        await fetchEvents();
        setSelectedEvent(null);
      }
    } catch (error) {
      console.error("[DBG][dashboard] Error deleting event:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/auth/signin");
    } catch (error) {
      console.error("[DBG][dashboard] Sign out failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className="bg-white shadow-sm flex-shrink-0 z-20">
          <div className="px-6 py-3 flex justify-between items-center">
            <h1 className="text-lg font-semibold text-gray-900">Calendar</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Chat input - collapsible */}
        <div className="bg-white border-b flex-shrink-0">
          <div className="p-3">
            <ChatInput onSubmit={processCommand} isProcessing={isProcessing} />

            {/* Chat messages */}
            {chatMessages.length > 0 && (
              <div className="mt-2 space-y-1 max-h-20 overflow-y-auto">
                {chatMessages.slice(-2).map((msg) => (
                  <div
                    key={msg.id}
                    className={`text-xs px-2 py-1 rounded ${
                      msg.type === "user"
                        ? "bg-indigo-50 text-indigo-900"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span className="font-medium">
                      {msg.type === "user" ? "You: " : "Calel: "}
                    </span>
                    {msg.content}
                  </div>
                ))}
              </div>
            )}

            {/* Event candidates for disambiguation */}
            {candidateSelection && (
              <div className="mt-2">
                <EventCandidates
                  events={candidateSelection.events}
                  action={candidateSelection.action}
                  onSelect={handleCandidateSelect}
                  onCancel={() => setCandidateSelection(null)}
                />
              </div>
            )}

            {/* Query results */}
            {queryResults && (
              <div className="mt-2">
                <QueryResults
                  events={queryResults.events}
                  dateLabel={queryResults.label}
                  onEventClick={handleQueryEventClick}
                  onClose={() => setQueryResults(null)}
                />
              </div>
            )}

            {/* Delete confirmation */}
            {pendingDelete && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 mb-2">
                  Delete &quot;{pendingDelete.title}&quot;?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmDelete}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setPendingDelete(null)}
                    className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Calendar Carousel */}
        <main className="flex-1 min-h-0">
          <CalendarCarousel initialView="day">
            <CalendarContent
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedYear={selectedYear}
              events={events}
              slots={slots}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              selectedEvent={selectedEvent}
              setSelectedEvent={setSelectedEvent}
              prefillEventData={prefillEventData}
              previewEvent={previewEvent}
              onSaveEvent={handleSaveEvent}
              onDeleteEvent={handleDeleteEvent}
              onEventFormChange={handleEventFormChange}
            />
          </CalendarCarousel>
        </main>
      </div>
    </div>
  );
}
