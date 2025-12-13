/**
 * Parse Command API
 *
 * Uses OpenAI to interpret natural language calendar commands
 * and convert them into structured actions.
 *
 * Supports: create_event, update_event, delete_event,
 * find_availability, query_event, set_availability
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type {
  ParseCommandRequest,
  ParsedCommand,
  ParseCommandResponse,
} from "@/types";

// Lazy initialization to avoid build-time errors
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `You are an AI assistant that parses natural language calendar commands into structured JSON.

Your ONLY output must be a single JSON object. Do NOT include explanations or extra text outside the JSON object.

JSON Output Format:
{
  "action": "create_event" | "update_event" | "delete_event" | "find_availability" | "query_event" | "set_availability" | "unknown",
  "event": {
    "title": "string or null",
    "date": "YYYY-MM-DD or null",
    "startTime": "HH:mm (24-hour) or null",
    "endTime": "HH:mm (24-hour) or null",
    "duration_minutes": "number or null",
    "description": "string or null"
  },
  "targetEvent": {
    "searchQuery": "string describing event to find or null",
    "date": "YYYY-MM-DD or null",
    "time": "HH:mm or null",
    "matchedEventId": "ID from existingEvents if matched or null"
  },
  "findSlot": {
    "duration_minutes": "number",
    "purpose": "string or null"
  },
  "query": {
    "date": "YYYY-MM-DD or null",
    "dateRange": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" } or null,
    "searchTerm": "string or null"
  },
  "availability": {
    "rules": [
      {
        "type": "weekly" | "date-specific",
        "days": [0-6],
        "date": "YYYY-MM-DD",
        "startTime": "HH:mm",
        "endTime": "HH:mm",
        "available": true | false
      }
    ],
    "action": "set" | "add" | "clear"
  },
  "message": "Human-friendly confirmation message",
  "raw_text": "the original user command"
}

Rules for Action Detection:
1. create_event: "block", "add", "schedule", "book", "create", "set up" + time/event details
2. update_event: "move", "reschedule", "change", "update", "shift" + reference to existing event
3. delete_event: "cancel", "delete", "remove", "clear" + reference to specific event
4. find_availability: "find", "when am I free", "next available", "find slot", "free time"
5. query_event: "what's on", "show", "list", "do I have", "what meetings", "schedule for"
6. set_availability: "available", "unavailable", "open", "working hours", setting general patterns
7. unknown: Cannot determine intent

Rules for Time/Date Resolution:
- Convert ALL relative dates to absolute YYYY-MM-DD using the provided currentDate
- "tomorrow" → add 1 day to currentDate
- "next Monday/Tuesday/etc" → calculate the next occurrence
- "this Friday" → the coming Friday of current week
- "in X days" → add X to currentDate
- Convert times to 24-hour format: "2pm" → "14:00", "9am" → "09:00"
- "noon" → "12:00", "midnight" → "00:00"
- "morning" → suggest 09:00, "afternoon" → suggest 14:00, "evening" → suggest 18:00

Rules for Duration:
- "for an hour" → 60 minutes
- "for 30 minutes" / "half hour" → 30 minutes
- "for 15 minutes" / "quick" → 15 minutes
- "for 2 hours" → 120 minutes
- If no duration and no end time, default to 60 minutes for events

Rules for Event Matching (update/delete):
- If existingEvents is provided, try to match by title similarity and time
- Set matchedEventId if confident match found
- Include searchQuery with keywords from user's description

Rules for Availability (set_availability):
- "weekdays" → days [1,2,3,4,5]
- "weekends" → days [0,6]
- "Monday" → days [1], "Tuesday" → days [2], etc.
- 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

Examples:

User: "block my calendar for 2pm tomorrow, lunch with mom"
Output:
{
  "action": "create_event",
  "event": {
    "title": "Lunch with Mom",
    "date": "[tomorrow's date]",
    "startTime": "14:00",
    "endTime": "15:00",
    "duration_minutes": 60,
    "description": null
  },
  "targetEvent": null,
  "findSlot": null,
  "query": null,
  "availability": null,
  "message": "I'll create 'Lunch with Mom' for tomorrow at 2:00 PM",
  "raw_text": "block my calendar for 2pm tomorrow, lunch with mom"
}

User: "move my dentist appointment to next Tuesday"
Output:
{
  "action": "update_event",
  "event": {
    "title": null,
    "date": "[next Tuesday's date]",
    "startTime": null,
    "endTime": null,
    "duration_minutes": null,
    "description": null
  },
  "targetEvent": {
    "searchQuery": "dentist",
    "date": null,
    "time": null,
    "matchedEventId": "[ID if found in existingEvents]"
  },
  "findSlot": null,
  "query": null,
  "availability": null,
  "message": "I'll move your dentist appointment to next Tuesday",
  "raw_text": "move my dentist appointment to next Tuesday"
}

User: "cancel my 3pm meeting"
Output:
{
  "action": "delete_event",
  "event": null,
  "targetEvent": {
    "searchQuery": "meeting",
    "date": null,
    "time": "15:00",
    "matchedEventId": "[ID if found]"
  },
  "findSlot": null,
  "query": null,
  "availability": null,
  "message": "I'll cancel your 3pm meeting",
  "raw_text": "cancel my 3pm meeting"
}

User: "find next 30 min slot for cleanup"
Output:
{
  "action": "find_availability",
  "event": null,
  "targetEvent": null,
  "findSlot": {
    "duration_minutes": 30,
    "purpose": "cleanup"
  },
  "query": null,
  "availability": null,
  "message": "I'll find the next available 30-minute slot for cleanup",
  "raw_text": "find next 30 min slot for cleanup"
}

User: "what's on my calendar tomorrow?"
Output:
{
  "action": "query_event",
  "event": null,
  "targetEvent": null,
  "findSlot": null,
  "query": {
    "date": "[tomorrow's date]",
    "dateRange": null,
    "searchTerm": null
  },
  "availability": null,
  "message": "Here's what's on your calendar for tomorrow",
  "raw_text": "what's on my calendar tomorrow?"
}

User: "available 9am to 5pm weekdays"
Output:
{
  "action": "set_availability",
  "event": null,
  "targetEvent": null,
  "findSlot": null,
  "query": null,
  "availability": {
    "rules": [
      {
        "type": "weekly",
        "days": [1, 2, 3, 4, 5],
        "startTime": "09:00",
        "endTime": "17:00",
        "available": true
      }
    ],
    "action": "set"
  },
  "message": "I've set your availability to 9 AM - 5 PM on weekdays",
  "raw_text": "available 9am to 5pm weekdays"
}

Always respond with valid JSON only, no markdown or explanation.`;

export async function POST(request: NextRequest) {
  try {
    const body: ParseCommandRequest = await request.json();
    const { command, currentDate, currentTime, existingEvents } = body;

    if (!command || typeof command !== "string") {
      return NextResponse.json<ParseCommandResponse>(
        { success: false, error: "Command is required" },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("[DBG][parse-command] OPENAI_API_KEY not configured");
      return NextResponse.json<ParseCommandResponse>(
        { success: false, error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    const dateContext = currentDate || new Date().toISOString().split("T")[0];
    const timeContext =
      currentTime ||
      new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });

    console.log("[DBG][parse-command] Processing command:", command);
    console.log(
      "[DBG][parse-command] Context - date:",
      dateContext,
      "time:",
      timeContext,
    );

    // Build context message with existing events if provided
    let contextMessage = `Current date: ${dateContext}\nCurrent time: ${timeContext}\n\n`;

    if (existingEvents && existingEvents.length > 0) {
      contextMessage += "Existing events for matching:\n";
      existingEvents.forEach((event) => {
        contextMessage += `- ID: ${event.id}, Title: "${event.title}", Date: ${event.date}, Time: ${event.startTime}-${event.endTime}\n`;
      });
      contextMessage += "\n";
    }

    contextMessage += `User command: "${command}"`;

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: contextMessage },
      ],
      temperature: 0.1,
      max_tokens: 800,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();

    if (!responseText) {
      console.error("[DBG][parse-command] Empty response from OpenAI");
      return NextResponse.json<ParseCommandResponse>(
        { success: false, error: "Failed to parse command" },
        { status: 500 },
      );
    }

    console.log("[DBG][parse-command] OpenAI response:", responseText);

    // Parse the JSON response
    let parsed: ParsedCommand;
    try {
      // Handle potential markdown code blocks
      const jsonStr = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error(
        "[DBG][parse-command] JSON parse error:",
        parseError,
        "Response:",
        responseText,
      );
      return NextResponse.json<ParseCommandResponse>({
        success: true,
        data: {
          action: "unknown",
          message:
            "I had trouble understanding that. Try something like 'Schedule lunch at 2pm tomorrow' or 'What's on my calendar today?'",
          raw_text: command,
        },
      });
    }

    // Validate and normalize the response
    if (!parsed.action) {
      parsed.action = "unknown";
    }

    if (!parsed.message) {
      parsed.message = getDefaultMessage(parsed.action);
    }

    if (!parsed.raw_text) {
      parsed.raw_text = command;
    }

    // Clean up null fields to reduce response size
    if (parsed.event === null) delete parsed.event;
    if (parsed.targetEvent === null) delete parsed.targetEvent;
    if (parsed.findSlot === null) delete parsed.findSlot;
    if (parsed.query === null) delete parsed.query;
    if (parsed.availability === null) delete parsed.availability;

    console.log("[DBG][parse-command] Parsed action:", parsed.action);

    return NextResponse.json<ParseCommandResponse>({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error("[DBG][parse-command] Error:", error);
    return NextResponse.json<ParseCommandResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

function getDefaultMessage(action: string): string {
  switch (action) {
    case "create_event":
      return "I'll create that event for you.";
    case "update_event":
      return "I'll update that event.";
    case "delete_event":
      return "I'll delete that event.";
    case "find_availability":
      return "I'll find an available time slot.";
    case "query_event":
      return "Here's what's on your calendar.";
    case "set_availability":
      return "I've updated your availability.";
    default:
      return "I'm not sure what you'd like to do. Try 'schedule a meeting' or 'what's on my calendar'.";
  }
}
