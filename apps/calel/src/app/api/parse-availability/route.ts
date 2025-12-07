/**
 * Parse Availability API
 *
 * Uses OpenAI to interpret natural language availability commands
 * and convert them into structured availability rules.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

interface AvailabilityRule {
  type: "weekly" | "date-specific";
  days?: number[]; // 0-6 for weekly (0 = Sunday)
  date?: string; // YYYY-MM-DD for date-specific
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  available: boolean;
}

interface ParsedResponse {
  rules: AvailabilityRule[];
  message: string;
  action: "set" | "add" | "clear" | "error";
}

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

const SYSTEM_PROMPT = `You are an AI assistant that parses natural language availability commands into structured rules.

The user will describe when they are available or unavailable. Convert their input into JSON with this structure:

{
  "rules": [
    {
      "type": "weekly" | "date-specific",
      "days": [0-6], // Only for weekly. 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
      "date": "YYYY-MM-DD", // Only for date-specific
      "startTime": "HH:mm", // 24-hour format
      "endTime": "HH:mm", // 24-hour format
      "available": true | false
    }
  ],
  "message": "Human-friendly confirmation of what was understood",
  "action": "set" | "add" | "clear" | "error"
}

Rules:
- "set" action replaces all existing rules
- "add" action adds to existing rules
- "clear" action clears all rules
- "error" when the command can't be parsed
- Use 24-hour time format (e.g., 09:00, 17:00)
- "weekdays" means days [1,2,3,4,5] (Mon-Fri)
- "weekends" means days [0,6] (Sun, Sat)
- For relative dates like "this Friday" or "next week", use the current date provided in the context
- Be helpful and infer reasonable defaults (e.g., "9 to 5" typically means 09:00-17:00)

Examples:
- "Available 9am to 5pm weekdays" → set, weekly, days [1,2,3,4,5], 09:00-17:00, available true
- "Block off December 25th" → add, date-specific, date "2024-12-25", 00:00-23:59, available false
- "Available Saturday 10am to 2pm" → add, weekly, days [6], 10:00-14:00, available true
- "Clear all" → clear action
- "Unavailable December 24-26" → add, multiple date-specific rules, available false

Always respond with valid JSON only, no markdown or explanation.`;

export async function POST(request: NextRequest) {
  try {
    const { command, currentDate } = await request.json();

    if (!command || typeof command !== "string") {
      return NextResponse.json(
        { success: false, error: "Command is required" },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("[DBG][parse-availability] OPENAI_API_KEY not configured");
      return NextResponse.json(
        { success: false, error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    const dateContext = currentDate || new Date().toISOString().split("T")[0];

    console.log("[DBG][parse-availability] Processing command:", command);

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Current date: ${dateContext}\n\nUser command: "${command}"`,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();

    if (!responseText) {
      console.error("[DBG][parse-availability] Empty response from OpenAI");
      return NextResponse.json(
        { success: false, error: "Failed to parse command" },
        { status: 500 },
      );
    }

    console.log("[DBG][parse-availability] OpenAI response:", responseText);

    // Parse the JSON response
    let parsed: ParsedResponse;
    try {
      // Handle potential markdown code blocks
      const jsonStr = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error(
        "[DBG][parse-availability] JSON parse error:",
        parseError,
        "Response:",
        responseText,
      );
      return NextResponse.json({
        success: true,
        data: {
          rules: [],
          message:
            "I had trouble understanding that. Could you try rephrasing? For example: 'Available 9am to 5pm weekdays'",
          action: "error",
        },
      });
    }

    // Validate the response structure
    if (!parsed.rules || !Array.isArray(parsed.rules)) {
      parsed.rules = [];
    }

    if (!parsed.message) {
      parsed.message = "Availability updated.";
    }

    if (!["set", "add", "clear", "error"].includes(parsed.action)) {
      parsed.action = "set";
    }

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error("[DBG][parse-availability] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
