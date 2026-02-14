/**
 * Agent: Assistant (tenant-facing)
 *
 * Tool definitions, executors, and system prompt builder for
 * the tenant dashboard AI assistant (daily brief, appointments, emails).
 */

import type { ToolDefinition } from "@/lib/openai";
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import type { CalendarEvent } from "@/types";
import type { BookingConfig } from "@/types/booking";
import { DEFAULT_BOOKING_CONFIG } from "@/types/booking";
import {
  getCalendarEventsByDateRange,
  getCalendarEventByIdOnly,
  updateCalendarEvent,
  getUpcomingCalendarEvents,
} from "@/lib/repositories/calendarEventRepository";
import {
  getEmailsByTenant,
  getUnreadCount,
  findEmailById,
} from "@/lib/repositories/emailRepository";
import { getSubscribersByTenant } from "@/lib/repositories/subscriberRepository";
import { pushUpdateToGoogle } from "@/lib/google-calendar-sync";

/**
 * Resolve the tenant's timezone from all possible sources.
 */
function resolveTenantTimezone(tenant: CallyTenant): string {
  const tz =
    tenant.timezone || tenant.bookingConfig?.timezone || "Australia/Sydney";
  console.log(
    `[DBG][assistant-tools] Resolved timezone: ${tz} (tenant.timezone=${tenant.timezone}, bookingConfig.timezone=${tenant.bookingConfig?.timezone})`,
  );
  return tz;
}

// ============================================================
// Tool Definitions
// ============================================================

const GET_DAILY_BRIEF_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "get_daily_brief",
    description:
      "Returns a summary of today's business activity: appointments, upcoming bookings, unread email count, and subscriber count.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

const GET_APPOINTMENTS_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "get_appointments",
    description:
      "Fetches appointments for a specific date or date range. Returns a list of calendar events.",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description:
            "Start date to fetch appointments for (YYYY-MM-DD format)",
        },
        endDate: {
          type: "string",
          description:
            "End date for the range (YYYY-MM-DD format). Defaults to startDate if not provided.",
        },
      },
      required: ["startDate"],
    },
  },
};

const UPDATE_APPOINTMENT_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "update_appointment",
    description:
      "Updates an existing appointment. Can change status (scheduled, completed, cancelled), notes, time, or title.",
    parameters: {
      type: "object",
      properties: {
        eventId: {
          type: "string",
          description: "The ID of the calendar event to update",
        },
        updates: {
          type: "object",
          description: "Fields to update on the appointment",
          properties: {
            status: {
              type: "string",
              enum: [
                "pending",
                "scheduled",
                "completed",
                "cancelled",
                "no_show",
              ],
              description: "New status for the appointment",
            },
            notes: {
              type: "string",
              description: "Notes to add or update on the appointment",
            },
            startTime: {
              type: "string",
              description: "New start time in ISO 8601 format",
            },
            endTime: {
              type: "string",
              description: "New end time in ISO 8601 format",
            },
            title: {
              type: "string",
              description: "New title for the appointment",
            },
          },
        },
      },
      required: ["eventId", "updates"],
    },
  },
};

const GET_RECENT_EMAILS_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "get_recent_emails",
    description:
      "Lists recent inbox emails. Can filter to unread only and limit the number of results.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of emails to return (default 10)",
        },
        unreadOnly: {
          type: "boolean",
          description: "If true, only return unread emails",
        },
      },
      required: [],
    },
  },
};

const GET_EMAIL_DETAIL_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "get_email_detail",
    description:
      "Gets the full content of a specific email by its ID. Use after get_recent_emails to read a particular message.",
    parameters: {
      type: "object",
      properties: {
        emailId: {
          type: "string",
          description: "The ID of the email to retrieve",
        },
      },
      required: ["emailId"],
    },
  },
};

export const ASSISTANT_TOOL_DEFINITIONS: ToolDefinition[] = [
  GET_DAILY_BRIEF_TOOL,
  GET_APPOINTMENTS_TOOL,
  UPDATE_APPOINTMENT_TOOL,
  GET_RECENT_EMAILS_TOOL,
  GET_EMAIL_DETAIL_TOOL,
];

// ============================================================
// Tool Executors
// ============================================================

/**
 * Execute an assistant tool call by name, returning a JSON string result.
 */
export async function executeAssistantToolCall(
  tenantId: string,
  toolName: string,
  toolArgs: string,
  tenant: CallyTenant,
): Promise<string> {
  console.log(
    `[DBG][assistant-tools] Executing tool: ${toolName} for tenant: ${tenantId}`,
  );

  const tz = resolveTenantTimezone(tenant);

  try {
    switch (toolName) {
      case "get_daily_brief":
        return await executeGetDailyBrief(tenantId, tz);
      case "get_appointments":
        return await executeGetAppointments(tenantId, toolArgs, tz);
      case "update_appointment":
        return await executeUpdateAppointment(tenantId, toolArgs, tenant, tz);
      case "get_recent_emails":
        return await executeGetRecentEmails(tenantId, toolArgs, tz);
      case "get_email_detail":
        return await executeGetEmailDetail(tenantId, toolArgs, tz);
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    console.error(`[DBG][assistant-tools] Error executing ${toolName}:`, error);
    return JSON.stringify({
      error: `Failed to execute ${toolName}. Please try again.`,
    });
  }
}

// ============================================================
// Individual Tool Executors
// ============================================================

/**
 * get_daily_brief — fetch today's summary in parallel
 */
async function executeGetDailyBrief(
  tenantId: string,
  timezone: string,
): Promise<string> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: timezone });

  // Events are stored with UTC-based dates in DynamoDB, so "today local" may
  // span two UTC days. Query yesterday through today to catch all events,
  // then filter to those whose startTime falls on "today" in the local tz.
  const yesterday = shiftDate(today, -1);

  const [rangeEvents, upcomingEvents, unreadEmailCount, subscribers] =
    await Promise.all([
      getCalendarEventsByDateRange(tenantId, yesterday, today),
      getUpcomingCalendarEvents(tenantId, 5, timezone),
      getUnreadCount(tenantId),
      getSubscribersByTenant(tenantId),
    ]);

  // Filter to events whose startTime is actually "today" in the local timezone
  const todayEvents = rangeEvents.filter((e) => {
    const localDate = new Date(e.startTime).toLocaleDateString("en-CA", {
      timeZone: timezone,
    });
    return localDate === today;
  });

  const brief = {
    date: today,
    appointments: todayEvents.map((e) => formatEventSummary(e, timezone)),
    upcomingNext5: upcomingEvents.map((e) => formatEventSummary(e, timezone)),
    unreadEmailCount,
    subscriberCount: subscribers.length,
  };

  console.log(
    `[DBG][assistant-tools] Daily brief: ${todayEvents.length} today, ${unreadEmailCount} unread emails, ${subscribers.length} subscribers`,
  );

  return JSON.stringify(brief);
}

/**
 * get_appointments — fetch events for a date range
 */
async function executeGetAppointments(
  tenantId: string,
  toolArgs: string,
  timezone: string,
): Promise<string> {
  const args = JSON.parse(toolArgs) as {
    startDate: string;
    endDate?: string;
  };

  const { startDate, endDate } = args;

  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return JSON.stringify({
      error: "Invalid startDate format. Please use YYYY-MM-DD.",
    });
  }

  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return JSON.stringify({
      error: "Invalid endDate format. Please use YYYY-MM-DD.",
    });
  }

  const effectiveEndDate = endDate || startDate;

  // Widen the DB query by 1 day each side to handle UTC/local date mismatch,
  // then filter events whose local startTime date falls in the requested range.
  const dbStart = shiftDate(startDate, -1);
  const dbEnd = effectiveEndDate; // no need to extend end — UTC is behind local
  const rawEvents = await getCalendarEventsByDateRange(
    tenantId,
    dbStart,
    dbEnd,
  );

  const events = rawEvents.filter((e) => {
    const localDate = new Date(e.startTime).toLocaleDateString("en-CA", {
      timeZone: timezone,
    });
    return localDate >= startDate && localDate <= effectiveEndDate;
  });

  console.log(
    `[DBG][assistant-tools] get_appointments: ${events.length} events for ${startDate} to ${effectiveEndDate} (queried DB ${dbStart} to ${dbEnd}, raw ${rawEvents.length})`,
  );

  return JSON.stringify({
    startDate,
    endDate: effectiveEndDate,
    appointments: events.map((e) => formatEventSummary(e, timezone)),
  });
}

/**
 * update_appointment — look up event and apply updates
 */
async function executeUpdateAppointment(
  tenantId: string,
  toolArgs: string,
  tenant: CallyTenant,
  timezone: string,
): Promise<string> {
  const args = JSON.parse(toolArgs) as {
    eventId: string;
    updates: {
      status?: string;
      notes?: string;
      startTime?: string;
      endTime?: string;
      title?: string;
    };
  };

  const { eventId, updates } = args;

  if (!eventId) {
    return JSON.stringify({ error: "eventId is required." });
  }

  // Look up the event by ID (searches across all dates)
  const event = await getCalendarEventByIdOnly(tenantId, eventId);
  if (!event) {
    return JSON.stringify({
      error: `Appointment with ID "${eventId}" not found.`,
    });
  }

  // Build the partial update
  const updatePayload: Partial<CalendarEvent> = {};
  if (updates.status) {
    updatePayload.status = updates.status as CalendarEvent["status"];
  }
  if (updates.notes !== undefined) {
    updatePayload.notes = updates.notes;
  }
  if (updates.startTime) {
    updatePayload.startTime = updates.startTime;
  }
  if (updates.endTime) {
    updatePayload.endTime = updates.endTime;
  }
  if (updates.title) {
    updatePayload.title = updates.title;
  }

  const updatedEvent = await updateCalendarEvent(
    tenantId,
    event.date,
    eventId,
    updatePayload,
  );

  if (!updatedEvent) {
    return JSON.stringify({ error: "Failed to update the appointment." });
  }

  // Push to Google Calendar if configured (fire-and-forget)
  pushUpdateToGoogle(tenant, updatedEvent).catch((err) =>
    console.warn("[DBG][assistant-tools] Google Calendar push failed:", err),
  );

  console.log(
    `[DBG][assistant-tools] Updated appointment: ${eventId}, changes: ${Object.keys(updates).join(", ")}`,
  );

  return JSON.stringify({
    success: true,
    updatedAppointment: formatEventSummary(updatedEvent, timezone),
    message: `Appointment "${updatedEvent.title}" has been updated.`,
  });
}

/**
 * get_recent_emails — list inbox emails with optional filters
 */
async function executeGetRecentEmails(
  tenantId: string,
  toolArgs: string,
  timezone: string,
): Promise<string> {
  const args = JSON.parse(toolArgs) as {
    limit?: number;
    unreadOnly?: boolean;
  };

  const limit = args.limit || 10;
  const unreadOnly = args.unreadOnly || false;

  const result = await getEmailsByTenant(tenantId, { limit, unreadOnly });

  const emails = result.emails.map((e) => ({
    id: e.id,
    from: e.from.name ? `${e.from.name} <${e.from.email}>` : e.from.email,
    subject: e.subject,
    receivedAt: formatDateTimeInTimezone(e.receivedAt, timezone),
    isRead: e.isRead,
    snippet: e.bodyText.slice(0, 120),
  }));

  console.log(
    `[DBG][assistant-tools] get_recent_emails: ${emails.length} emails (unreadOnly: ${unreadOnly})`,
  );

  return JSON.stringify({
    emails,
    totalCount: result.totalCount,
    unreadCount: result.unreadCount,
  });
}

/**
 * get_email_detail — fetch the full content of a specific email
 */
async function executeGetEmailDetail(
  tenantId: string,
  toolArgs: string,
  timezone: string,
): Promise<string> {
  const args = JSON.parse(toolArgs) as { emailId: string };
  const { emailId } = args;

  if (!emailId) {
    return JSON.stringify({ error: "emailId is required." });
  }

  const email = await findEmailById(emailId, tenantId);
  if (!email) {
    return JSON.stringify({
      error: `Email with ID "${emailId}" not found.`,
    });
  }

  console.log(
    `[DBG][assistant-tools] get_email_detail: ${emailId} — "${email.subject}"`,
  );

  return JSON.stringify({
    id: email.id,
    from: email.from.name
      ? `${email.from.name} <${email.from.email}>`
      : email.from.email,
    to: email.to.map((t) => (t.name ? `${t.name} <${t.email}>` : t.email)),
    cc: email.cc?.map((c) => (c.name ? `${c.name} <${c.email}>` : c.email)),
    subject: email.subject,
    bodyText: email.bodyText,
    receivedAt: formatDateTimeInTimezone(email.receivedAt, timezone),
    isRead: email.isRead,
    attachments: email.attachments.map((a) => ({
      filename: a.filename,
      mimeType: a.mimeType,
      size: a.size,
    })),
  });
}

// ============================================================
// System Prompt Builder
// ============================================================

/**
 * Build the system prompt for the tenant-facing assistant agent.
 * Includes all relevant tenant settings so the AI has full context.
 */
export function buildAssistantSystemPrompt(tenant: CallyTenant): string {
  const businessName =
    tenant.aiAssistantConfig?.businessInfo?.businessName ||
    tenant.name ||
    "your business";
  const timezone = resolveTenantTimezone(tenant);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: timezone });

  const parts: string[] = [];

  // Role
  parts.push(
    `You are an AI business assistant for ${businessName}. You help the business owner manage their day efficiently.`,
  );

  // Core context
  parts.push(`\nCONTEXT:`);
  parts.push(`- Business name: ${businessName}`);
  parts.push(`- Owner: ${tenant.name} (${tenant.email})`);
  parts.push(`- Today's date: ${today}`);
  if (tenant.currency) parts.push(`- Currency: ${tenant.currency}`);
  if (tenant.address) parts.push(`- Address: ${tenant.address}`);
  if (tenant.defaultEventDuration) {
    parts.push(
      `- Default appointment duration: ${tenant.defaultEventDuration} minutes`,
    );
  }

  // Business info from AI assistant config
  const biz = tenant.aiAssistantConfig?.businessInfo;
  if (biz) {
    parts.push(`\nBUSINESS DETAILS:`);
    if (biz.description) parts.push(`- About: ${biz.description}`);
    if (biz.openingHours) parts.push(`- Opening hours: ${biz.openingHours}`);
    if (biz.services) parts.push(`- Services: ${biz.services}`);
    if (biz.contactInfo) parts.push(`- Contact: ${biz.contactInfo}`);
    if (biz.location) parts.push(`- Location: ${biz.location}`);
    if (biz.additionalNotes) parts.push(`- Notes: ${biz.additionalNotes}`);
  }

  // Booking configuration
  if (tenant.bookingConfig) {
    const bc: BookingConfig = {
      ...DEFAULT_BOOKING_CONFIG,
      ...tenant.bookingConfig,
    };
    parts.push(`\nBOOKING SETTINGS:`);
    parts.push(`- Slot duration: ${bc.slotDurationMinutes} minutes`);
    parts.push(`- Lookahead: up to ${bc.lookaheadDays} days in advance`);
    // timezone omitted — all times are pre-converted
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const scheduleLines = Object.entries(bc.weeklySchedule)
      .map(([dayIndex, schedule]) => {
        const dayName = dayNames[Number(dayIndex)];
        if (!schedule.enabled) return `  ${dayName}: Closed`;
        return `  ${dayName}: ${formatHour(schedule.startHour)} – ${formatHour(schedule.endHour)}`;
      })
      .join("\n");
    parts.push(`- Business hours:\n${scheduleLines}`);
  }

  // Integrations status
  const integrations: string[] = [];
  if (tenant.googleCalendarConfig?.calendarId) {
    integrations.push("Google Calendar (synced)");
  }
  if (tenant.outlookCalendarConfig) {
    integrations.push("Outlook Calendar");
  }
  if (tenant.zoomConfig?.accessToken) {
    integrations.push("Zoom");
  }
  if (tenant.stripeConfig?.chargesEnabled) {
    integrations.push("Stripe (payments enabled)");
  }
  if (tenant.domainConfig?.domain) {
    integrations.push(`Custom domain: ${tenant.domainConfig.domain}`);
  }
  if (tenant.emailConfig?.domainEmail) {
    integrations.push(`Email: ${tenant.emailConfig.domainEmail}`);
  }
  if (tenant.videoCallPreference) {
    integrations.push(
      `Video call preference: ${tenant.videoCallPreference.replace("_", " ")}`,
    );
  }
  if (integrations.length > 0) {
    parts.push(`\nACTIVE INTEGRATIONS:`);
    integrations.forEach((i) => parts.push(`- ${i}`));
  }

  // Tools
  parts.push(`\nAVAILABLE TOOLS:`);
  parts.push(
    `1. **get_daily_brief** — Get a summary of today's activity (appointments, upcoming bookings, unread emails, subscriber count). Use this when greeted or asked for a summary/brief/overview.`,
  );
  parts.push(
    `2. **get_appointments** — Fetch appointments for a date or date range. Use when asked about specific dates.`,
  );
  parts.push(
    `3. **update_appointment** — Update an appointment's status, notes, time, or title. Always confirm with the user before executing changes.`,
  );
  parts.push(
    `4. **get_recent_emails** — List recent inbox emails. Can filter to unread only.`,
  );
  parts.push(
    `5. **get_email_detail** — Get the full content of a specific email by ID.`,
  );

  // Instructions
  parts.push(`\nINSTRUCTIONS:`);
  parts.push(
    `- When greeted or asked for a summary, call get_daily_brief automatically.`,
  );
  parts.push(
    `- When asked about appointments on a date, call get_appointments with the relevant date range.`,
  );
  parts.push(
    `- When asked to cancel, reschedule, or update an appointment, ALWAYS confirm the details with the user before calling update_appointment.`,
  );
  parts.push(
    `- When asked about emails or the inbox, call get_recent_emails. If the user wants to read a specific email, call get_email_detail.`,
  );
  parts.push(
    `- Present information in a clear, concise format. Use bullet points for lists.`,
  );
  parts.push(
    `- All times from tools are already converted to the business local timezone. NEVER mention or display the timezone name — just show the time (e.g. "7:00 AM", not "7:00 AM (Australia/Sydney)" or "7:00 AM AEST").`,
  );
  parts.push(
    `- For dates, interpret relative terms (e.g. "today", "tomorrow", "next Monday") based on today's date (${today}).`,
  );
  parts.push(
    `- Be friendly, professional, and proactive — suggest next actions when appropriate.`,
  );
  parts.push(`- Keep responses concise and actionable.`);

  return parts.join("\n");
}

// ============================================================
// Helpers
// ============================================================

/**
 * Format a CalendarEvent into a concise summary object for tool results.
 * Converts ISO times to human-readable format in the tenant's timezone.
 */
function formatEventSummary(event: CalendarEvent, timezone: string) {
  // Derive the display date from startTime in the tenant's timezone
  // (the stored event.date may be UTC-based and off by a day)
  const localDate = new Date(event.startTime).toLocaleDateString("en-CA", {
    timeZone: timezone,
  });

  return {
    id: event.id,
    title: event.title,
    date: localDate,
    startTime: formatTimeInTimezone(event.startTime, timezone),
    endTime: formatTimeInTimezone(event.endTime, timezone),
    startTimeISO: event.startTime,
    endTimeISO: event.endTime,
    status: event.status,
    description: event.description || "",
    notes: event.notes || "",
  };
}

/**
 * Format an ISO time string to a human-readable time in the given timezone.
 * e.g. "10:00 AM"
 */
function formatTimeInTimezone(isoString: string, timezone: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format an ISO string to a full date-time in the given timezone.
 * e.g. "Feb 14, 2026 at 3:30 PM"
 */
function formatDateTimeInTimezone(isoString: string, timezone: string): string {
  const d = new Date(isoString);
  return d.toLocaleString("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format an hour number (0-23) to a human-readable time string.
 * e.g. 9 → "9:00 AM", 17 → "5:00 PM"
 */
function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h}:00 ${period}`;
}

/**
 * Shift a YYYY-MM-DD date string by a number of days.
 * e.g. shiftDate("2026-02-15", -1) → "2026-02-14"
 */
function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().substring(0, 10);
}
