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
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, getDay, getYear, startOfYear } from "date-fns";
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
  type TimeSlot,
  type CalendarEvent,
} from "@/components/calendar";
import { Sidebar } from "@/components/layout";

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
  setSelectedYear,
  events,
  slots,
  selectedTime,
  setSelectedTime,
  selectedEvent,
  setSelectedEvent,
  onSaveEvent,
  onDeleteEvent,
}: {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  events: CalendarEvent[];
  slots: TimeSlot[];
  selectedTime: string;
  setSelectedTime: (time: string) => void;
  selectedEvent: CalendarEvent | null;
  setSelectedEvent: (event: CalendarEvent | null) => void;
  onSaveEvent: (event: Omit<CalendarEvent, "id">) => void;
  onDeleteEvent: (eventId: string) => void;
}) {
  const { navigateTo, navigateRight, isRightColumn } = useCarousel();

  // Handle year selection from year view (never navigates - year is always leftmost)
  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    // Set selectedDate to January 1st of that year
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
  const handleSlotClick = (time: string) => {
    setSelectedTime(time);
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
          onSlotClick={handleSlotClick}
          onEventClick={handleEventClick}
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
          onSave={onSaveEvent}
          onDelete={onDeleteEvent}
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
  const [selectedYear, setSelectedYear] = useState(() => getYear(new Date()));

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

  // Parse natural language command
  const processCommand = async (command: string) => {
    setIsProcessing(true);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: command,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);

    let response = "";
    let newRules: AvailabilityRule[] = [...availabilityRules];

    try {
      const apiResponse = await fetch("/api/parse-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          currentDate: format(selectedDate, "yyyy-MM-dd"),
        }),
      });

      const result = await apiResponse.json();

      if (!result.success) {
        response =
          "Sorry, I had trouble processing that. Please try again later.";
      } else {
        const { rules, message, action } = result.data;
        response = message;

        switch (action) {
          case "set":
            newRules = rules;
            break;
          case "add":
            newRules = [...availabilityRules, ...rules];
            break;
          case "clear":
            newRules = [];
            break;
        }

        setAvailabilityRules(newRules);
      }
    } catch (error) {
      console.error("[DBG][dashboard] Command processing error:", error);
      response = "Sorry, I had trouble understanding that.";
    }

    const systemMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: "system",
      content: response,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, systemMessage]);

    setIsProcessing(false);
  };

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
            <ChatInput
              onSubmit={processCommand}
              isProcessing={isProcessing}
              placeholder="Set availability... (e.g., 'Available 9-5 weekdays')"
            />
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
          </div>
        </div>

        {/* Calendar Carousel */}
        <main className="flex-1 min-h-0">
          <CalendarCarousel initialView="month">
            <CalendarContent
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              events={events}
              slots={slots}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              selectedEvent={selectedEvent}
              setSelectedEvent={setSelectedEvent}
              onSaveEvent={handleSaveEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          </CalendarCarousel>
        </main>
      </div>
    </div>
  );
}
