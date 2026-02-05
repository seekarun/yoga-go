/**
 * Briefing Generator for Cally
 * Generates morning briefing content from calendar events and emails
 */

import type { CalendarEvent, Email } from "@/types";
import type {
  BriefingContent,
  BriefingCalendarEvent,
  BriefingEmailSummary,
  PhoneConfig,
} from "@/types/phone-calling";
import * as calendarEventRepository from "@/lib/repositories/calendarEventRepository";
import { getEmailsByTenant } from "@/lib/repositories/emailRepository";

/**
 * Format time from ISO to human-readable (e.g., "9:30 AM")
 */
function formatTime(isoDate: string, timezone: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    });
  } catch {
    // Fallback if timezone is invalid
    const date = new Date(isoDate);
    return date.toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
}

/**
 * Format date for greeting (e.g., "Thursday, February 5th")
 */
function formatDateForGreeting(date: Date, timezone: string): string {
  try {
    return date.toLocaleDateString("en-AU", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: timezone,
    });
  } catch {
    return date.toLocaleDateString("en-AU", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }
}

/**
 * Get today's date in YYYY-MM-DD format for a timezone
 */
function getTodayInTimezone(timezone: string): string {
  const now = new Date();
  try {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timezone,
    };
    const parts = new Intl.DateTimeFormat("en-CA", options).formatToParts(now);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    return `${year}-${month}-${day}`;
  } catch {
    // Fallback to UTC
    return now.toISOString().substring(0, 10);
  }
}

/**
 * Convert calendar events to briefing format
 */
function eventsToSummary(
  events: CalendarEvent[],
  timezone: string,
): BriefingCalendarEvent[] {
  return events.map((event) => ({
    title: event.title,
    startTime: formatTime(event.startTime, timezone),
    endTime: event.endTime ? formatTime(event.endTime, timezone) : undefined,
    location: event.location,
  }));
}

/**
 * Convert emails to briefing format
 */
function emailsToSummary(emails: Email[]): BriefingEmailSummary[] {
  return emails.slice(0, 5).map((email) => ({
    from: email.from.name || email.from.email,
    subject: email.subject,
    preview: email.bodyText?.substring(0, 100),
  }));
}

/**
 * Generate calendar summary script
 */
function generateCalendarScript(events: BriefingCalendarEvent[]): string {
  if (events.length === 0) {
    return "You have no scheduled events today.";
  }

  const eventCount = events.length;
  const eventWord = eventCount === 1 ? "event" : "events";

  let script = `You have ${eventCount} ${eventWord} scheduled today. `;

  events.forEach((event, index) => {
    const orderWord =
      index === 0 ? "First" : index === events.length - 1 ? "Finally" : "Then";
    let eventLine = `${orderWord}, ${event.title} at ${event.startTime}`;
    if (event.location) {
      eventLine += ` at ${event.location}`;
    }
    eventLine += ". ";
    script += eventLine;
  });

  return script.trim();
}

/**
 * Generate email summary script
 */
function generateEmailScript(
  emails: BriefingEmailSummary[],
  unreadCount: number,
): string {
  if (unreadCount === 0) {
    return "Your inbox is clear. No new emails.";
  }

  const emailWord = unreadCount === 1 ? "email" : "emails";
  let script = `You have ${unreadCount} unread ${emailWord}. `;

  if (emails.length > 0) {
    script += "Here are the most recent: ";
    emails.forEach((email, index) => {
      const connector =
        index === 0 ? "" : index === emails.length - 1 ? "And " : "";
      script += `${connector}From ${email.from}, about ${email.subject}. `;
    });
  }

  return script.trim();
}

/**
 * Generate greeting based on time of day
 */
function generateGreeting(
  tenantName: string,
  date: Date,
  timezone: string,
): string {
  let greeting = "Good morning";
  try {
    const hour = parseInt(
      new Intl.DateTimeFormat("en-AU", {
        hour: "numeric",
        hour12: false,
        timeZone: timezone,
      }).format(date),
    );
    if (hour >= 12 && hour < 17) {
      greeting = "Good afternoon";
    } else if (hour >= 17) {
      greeting = "Good evening";
    }
  } catch {
    // Default to morning
  }

  const formattedDate = formatDateForGreeting(date, timezone);
  return `${greeting}, ${tenantName}! This is your daily briefing for ${formattedDate}.`;
}

/**
 * Generate closing message
 */
function generateClosing(): string {
  const closings = [
    "Have a productive day!",
    "Wishing you a great day ahead!",
    "That's all for now. Have a wonderful day!",
    "Stay focused and have a great day!",
  ];
  return closings[Math.floor(Math.random() * closings.length)];
}

/**
 * Fetch and generate briefing content for a tenant
 */
export async function generateBriefingContent(
  tenantId: string,
  tenantName: string,
  phoneConfig: PhoneConfig,
): Promise<BriefingContent> {
  console.log(
    "[DBG][briefing-generator] Generating briefing for tenant:",
    tenantId,
  );

  const timezone = phoneConfig.morningBriefingTimezone || "Australia/Sydney";
  const includeCalendar = phoneConfig.includeCalendarEvents !== false;
  const includeEmails = phoneConfig.includeUnreadEmails !== false;

  const now = new Date();
  const todayDate = getTodayInTimezone(timezone);

  // Generate greeting
  const greeting = generateGreeting(tenantName, now, timezone);

  let calendarSummary: string | undefined;
  let emailSummary: string | undefined;

  // Fetch calendar events for today
  if (includeCalendar) {
    console.log(
      "[DBG][briefing-generator] Fetching calendar events for:",
      todayDate,
    );
    const events = await calendarEventRepository.getCalendarEventsByDateRange(
      tenantId,
      todayDate,
      todayDate,
    );
    // Filter to only scheduled events (not cancelled)
    const scheduledEvents = events.filter((e) => e.status === "scheduled");
    // Sort by start time
    scheduledEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));
    const briefingEvents = eventsToSummary(scheduledEvents, timezone);
    calendarSummary = generateCalendarScript(briefingEvents);
    console.log(
      "[DBG][briefing-generator] Found",
      scheduledEvents.length,
      "events",
    );
  }

  // Fetch unread emails
  if (includeEmails) {
    console.log("[DBG][briefing-generator] Fetching unread emails");
    const emailResult = await getEmailsByTenant(tenantId, {
      unreadOnly: true,
      limit: 5,
    });
    const briefingEmails = emailsToSummary(emailResult.emails);
    emailSummary = generateEmailScript(briefingEmails, emailResult.unreadCount);
    console.log(
      "[DBG][briefing-generator] Found",
      emailResult.unreadCount,
      "unread emails",
    );
  }

  // Generate closing
  const closing = generateClosing();

  // Build full script
  const scriptParts = [greeting];
  if (calendarSummary) {
    scriptParts.push(calendarSummary);
  }
  if (emailSummary) {
    scriptParts.push(emailSummary);
  }
  scriptParts.push(closing);

  const fullScript = scriptParts.join(" ");

  console.log(
    "[DBG][briefing-generator] Generated briefing, length:",
    fullScript.length,
  );

  return {
    greeting,
    calendarSummary,
    emailSummary,
    closing,
    fullScript,
  };
}

/**
 * Generate a custom call script with optional AI enhancement
 */
export async function generateCustomCallScript(
  message: string,
  tenantName: string,
  enhanceWithAi: boolean = false,
): Promise<string> {
  console.log("[DBG][briefing-generator] Generating custom call script");

  // For now, just return the message with a greeting
  // In the future, we could use OpenAI to polish/enhance the message
  if (!enhanceWithAi) {
    return `Hello, this is a message from ${tenantName}. ${message}`;
  }

  // TODO: Implement AI enhancement using OpenAI
  // For now, just return the basic message
  return `Hello, this is a message from ${tenantName}. ${message}`;
}
