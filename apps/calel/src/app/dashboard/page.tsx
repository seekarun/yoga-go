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
import { format, getDay } from "date-fns";
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

  // Parse natural language command using OpenAI and update availability
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

    let response = "";
    let newRules: AvailabilityRule[] = [...availabilityRules];

    try {
      // Call OpenAI-powered API to parse the command
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
        console.error("[DBG][dashboard] API error:", result.error);
        response =
          "Sorry, I had trouble processing that. Please try again later.";
      } else {
        const { rules, message, action } = result.data;
        response = message;

        switch (action) {
          case "set":
            // Replace all rules
            newRules = rules;
            break;
          case "add":
            // Add to existing rules
            newRules = [...availabilityRules, ...rules];
            break;
          case "clear":
            // Clear all rules
            newRules = [];
            break;
          case "error":
            // Keep existing rules, just show the error message
            break;
        }

        setAvailabilityRules(newRules);
      }
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
