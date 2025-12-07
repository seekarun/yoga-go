"use client";

/**
 * Dashboard Page
 *
 * Chat-based calendar management interface.
 * Features:
 * - Natural language command input for setting availability
 * - Horizontal date scroller
 * - 30-minute time slot grid
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, isWeekend, getDay } from "date-fns";
import {
  DateScroller,
  TimeGrid,
  ChatInput,
  type TimeSlot,
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

// Default availability rules
interface AvailabilityRule {
  type: "weekly" | "date-specific";
  days?: number[]; // 0-6 for weekly (0 = Sunday)
  date?: string; // ISO date for date-specific
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  available: boolean;
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
    // Default: Available 9-5 on weekdays
    {
      type: "weekly",
      days: [1, 2, 3, 4, 5], // Mon-Fri
      startTime: "09:00",
      endTime: "17:00",
      available: true,
    },
  ]);

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

          // Check rules in order (later rules override earlier ones)
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

  // Parse natural language command and update availability
  const processCommand = async (command: string) => {
    setIsProcessing(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: command,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);

    // Simple command parsing (in production, this would use an LLM)
    const lowerCommand = command.toLowerCase();
    let response = "";
    let newRules: AvailabilityRule[] = [...availabilityRules];

    try {
      // Parse "available X to Y weekdays" pattern
      const weekdayMatch = lowerCommand.match(
        /available\s+(\d{1,2})\s*(?:am|pm)?\s*to\s+(\d{1,2})\s*(?:am|pm)?\s*(?:on\s+)?weekdays/i,
      );
      const weekdayMatch2 = lowerCommand.match(
        /available\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?\s*(?:to|-)\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?/i,
      );

      // Parse "unavailable except X to Y" pattern
      const exceptMatch = lowerCommand.match(
        /unavailable.*except\s+(\d{1,2})\s*(?:am|pm)?\s*to\s+(\d{1,2})\s*(?:am|pm)?/i,
      );

      if (
        exceptMatch ||
        lowerCommand.includes("9 to 5") ||
        lowerCommand.includes("9am to 5pm")
      ) {
        // Set available only during business hours on weekdays
        newRules = [
          {
            type: "weekly",
            days: [1, 2, 3, 4, 5],
            startTime: "09:00",
            endTime: "17:00",
            available: true,
          },
        ];
        response =
          "Got it! I've set you as available Monday to Friday, 9 AM to 5 PM. All other times are unavailable.";
      } else if (weekdayMatch || weekdayMatch2) {
        const match = weekdayMatch || weekdayMatch2;
        let startHour = parseInt(match![1]);
        let endHour = parseInt(match![4] || match![2]);

        // Handle AM/PM
        if (lowerCommand.includes("pm") && endHour < 12) {
          endHour += 12;
        }
        if (lowerCommand.includes("am") && startHour === 12) {
          startHour = 0;
        }

        newRules = [
          {
            type: "weekly",
            days: [1, 2, 3, 4, 5],
            startTime: `${startHour.toString().padStart(2, "0")}:00`,
            endTime: `${endHour.toString().padStart(2, "0")}:00`,
            available: true,
          },
        ];
        response = `Updated! You're now available weekdays from ${startHour > 12 ? startHour - 12 : startHour}${startHour >= 12 ? "PM" : "AM"} to ${endHour > 12 ? endHour - 12 : endHour}${endHour >= 12 ? "PM" : "AM"}.`;
      } else if (
        lowerCommand.includes("clear") ||
        lowerCommand.includes("reset")
      ) {
        newRules = [];
        response =
          "All availability cleared. You're now showing as unavailable for all times.";
      } else if (
        lowerCommand.includes("block") ||
        lowerCommand.includes("unavailable")
      ) {
        // For now, just acknowledge
        response =
          "I understand you want to block some time. Could you be more specific? For example: 'Block off Friday afternoon' or 'Unavailable December 25th'.";
      } else if (
        lowerCommand.includes("saturday") ||
        lowerCommand.includes("sunday")
      ) {
        const isSaturday = lowerCommand.includes("saturday");
        const day = isSaturday ? 6 : 0;
        const timeMatch = lowerCommand.match(
          /(\d{1,2})\s*(am|pm)?\s*to\s*(\d{1,2})\s*(am|pm)?/i,
        );

        if (timeMatch) {
          let startHour = parseInt(timeMatch[1]);
          let endHour = parseInt(timeMatch[3]);

          if (timeMatch[2]?.toLowerCase() === "pm" && startHour < 12)
            startHour += 12;
          if (timeMatch[4]?.toLowerCase() === "pm" && endHour < 12)
            endHour += 12;

          newRules.push({
            type: "weekly",
            days: [day],
            startTime: `${startHour.toString().padStart(2, "0")}:00`,
            endTime: `${endHour.toString().padStart(2, "0")}:00`,
            available: true,
          });
          response = `Added! You're now available on ${isSaturday ? "Saturday" : "Sunday"}s from ${startHour > 12 ? startHour - 12 : startHour}${startHour >= 12 ? "PM" : "AM"} to ${endHour > 12 ? endHour - 12 : endHour}${endHour >= 12 ? "PM" : "AM"}.`;
        }
      } else {
        response =
          "I'm not sure how to process that command yet. Try something like:\n• 'Available 9am to 5pm weekdays'\n• 'Unavailable except 9 to 5 weekdays'\n• 'Available Saturday 10am to 2pm'";
      }

      setAvailabilityRules(newRules);
    } catch (error) {
      console.error("[DBG][dashboard] Command processing error:", error);
      response =
        "Sorry, I had trouble understanding that. Please try rephrasing your request.";
    }

    // Add system response
    const systemMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: "system",
      content: response,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, systemMessage]);

    setIsProcessing(false);
  };

  const handleSlotClick = (time: string) => {
    console.log("[DBG][dashboard] Slot clicked:", time);
    // Could toggle individual slots or show a context menu
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
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-20">
          <div className="px-6 py-3 flex justify-between items-center">
            <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
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

        {/* Main content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Chat Input - Prominent at top */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Set Your Availability
              </h2>
              <ChatInput
                onSubmit={processCommand}
                isProcessing={isProcessing}
                placeholder="Tell me when you're available... (e.g., 'Available 9am to 5pm weekdays')"
              />
            </div>

            {/* Recent messages */}
            {chatMessages.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-500">
                  Recent Updates
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {chatMessages.slice(-4).map((msg) => (
                    <div
                      key={msg.id}
                      className={`text-sm p-2 rounded ${
                        msg.type === "user"
                          ? "bg-indigo-50 text-indigo-900"
                          : "bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span className="font-medium">
                        {msg.type === "user" ? "You: " : "Calel: "}
                      </span>
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date Scroller */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <DateScroller
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            </div>

            {/* Time Grid */}
            <div>
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {format(selectedDate, "EEEE")}&#39;s Schedule
                </h3>
              </div>
              <TimeGrid
                date={selectedDate}
                slots={slots}
                onSlotClick={handleSlotClick}
              />
            </div>

            {/* Current Rules Summary */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                Current Availability Rules
              </h3>
              {availabilityRules.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No rules set. Use the chat above to set your availability.
                </p>
              ) : (
                <ul className="space-y-2">
                  {availabilityRules.map((rule, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-gray-700 flex items-center gap-2"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${rule.available ? "bg-green-500" : "bg-red-500"}`}
                      />
                      {rule.type === "weekly" && (
                        <span>
                          {rule.days
                            ?.map(
                              (d) =>
                                [
                                  "Sun",
                                  "Mon",
                                  "Tue",
                                  "Wed",
                                  "Thu",
                                  "Fri",
                                  "Sat",
                                ][d],
                            )
                            .join(", ")}
                          : {rule.startTime} - {rule.endTime}
                        </span>
                      )}
                      {rule.type === "date-specific" && (
                        <span>
                          {rule.date}: {rule.startTime} - {rule.endTime}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
