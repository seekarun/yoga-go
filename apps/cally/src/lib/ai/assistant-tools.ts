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
  createCalendarEvent,
  getUpcomingCalendarEvents,
  getTenantCalendarEvents,
} from "@/lib/repositories/calendarEventRepository";
import {
  getEmailsByTenant,
  getUnreadCount,
  findEmailById,
  getEmailsByContact,
  createEmail,
  getEmailThread,
  updateEmailThreadId,
} from "@/lib/repositories/emailRepository";
import { createDraft } from "@/lib/repositories/draftRepository";
import { getSubscribersByTenant } from "@/lib/repositories/subscriberRepository";
import { getContactsByEmail } from "@/lib/repositories/contactRepository";
import { getFeedbackByTenant } from "@/lib/repositories/feedbackRepository";
import { mergeSubscribersAndVisitors } from "@/lib/users/mergeUsers";
import {
  parseVisitorFromDescription,
  getFromEmail,
} from "@/lib/email/bookingNotification";
import { sendOutgoingEmail } from "@/lib/email/replyEmail";
import {
  pushUpdateToGoogle,
  pushCreateToGoogle,
} from "@/lib/google-calendar-sync";
import { pushCreateToOutlook } from "@/lib/outlook-calendar-sync";
import type { EmailAddress, EmailSignatureConfig } from "@/types";

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

const CREATE_APPOINTMENT_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "create_appointment",
    description:
      "Creates a new appointment/calendar event. Always confirm the details with the user before creating.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title/name of the appointment",
        },
        startTime: {
          type: "string",
          description:
            "Start time in ISO 8601 format (e.g. 2026-02-20T10:00:00+11:00)",
        },
        endTime: {
          type: "string",
          description:
            "End time in ISO 8601 format (e.g. 2026-02-20T11:00:00+11:00)",
        },
        description: {
          type: "string",
          description: "Description or details about the appointment",
        },
        location: {
          type: "string",
          description: "Location of the appointment",
        },
        notes: {
          type: "string",
          description: "Internal notes about the appointment",
        },
      },
      required: ["title", "startTime", "endTime"],
    },
  },
};

const GET_RECENT_EMAILS_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "get_recent_emails",
    description:
      "Lists emails with rich filtering. Supports search, folder, sender/recipient filtering, date range, starred, attachments.",
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
        starredOnly: {
          type: "boolean",
          description: "If true, only return starred emails",
        },
        search: {
          type: "string",
          description:
            "Free-text search across subject, sender, and body content",
        },
        folder: {
          type: "string",
          enum: ["inbox", "sent", "trash", "archive"],
          description: "Email folder to list (default: inbox)",
        },
        from: {
          type: "string",
          description: "Filter by sender name or email address (partial match)",
        },
        to: {
          type: "string",
          description:
            "Filter by recipient name or email address (partial match)",
        },
        hasAttachment: {
          type: "boolean",
          description: "If true, only return emails with attachments",
        },
        after: {
          type: "string",
          description:
            "Only return emails received after this date (YYYY-MM-DD)",
        },
        before: {
          type: "string",
          description:
            "Only return emails received before this date (YYYY-MM-DD)",
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

const GET_CUSTOMER_CONTEXT_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "get_customer_context",
    description:
      "Get comprehensive context about a customer: profile, booking history, emails, reviews/feedback, and contact submissions. Provide either a customer email or an event/booking ID to look up the customer.",
    parameters: {
      type: "object",
      properties: {
        customerEmail: {
          type: "string",
          description: "The customer's email address. Provide this OR eventId.",
        },
        eventId: {
          type: "string",
          description:
            "A calendar event/booking ID to resolve the customer from. Provide this OR customerEmail.",
        },
      },
      required: [],
    },
  },
};

const GET_EMAIL_THREAD_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "get_email_thread",
    description:
      "Fetches the full conversation thread for an email. Use this to understand context before replying.",
    parameters: {
      type: "object",
      properties: {
        emailId: {
          type: "string",
          description: "The ID of any email in the thread",
        },
      },
      required: ["emailId"],
    },
  },
};

const SEND_EMAIL_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "send_email",
    description:
      "Compose and send a new email from the business email address. Always confirm content with the user before calling.",
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "array",
          items: {
            type: "object",
            properties: {
              email: { type: "string", description: "Recipient email address" },
              name: { type: "string", description: "Recipient display name" },
            },
            required: ["email"],
          },
          description: "List of primary recipients",
        },
        cc: {
          type: "array",
          items: {
            type: "object",
            properties: {
              email: { type: "string" },
              name: { type: "string" },
            },
            required: ["email"],
          },
          description: "CC recipients (optional)",
        },
        bcc: {
          type: "array",
          items: {
            type: "object",
            properties: {
              email: { type: "string" },
              name: { type: "string" },
            },
            required: ["email"],
          },
          description: "BCC recipients (optional)",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        text: {
          type: "string",
          description:
            "Email body in plain text. Do NOT include a signature — it is appended automatically.",
        },
      },
      required: ["to", "subject", "text"],
    },
  },
};

const REPLY_TO_EMAIL_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "reply_to_email",
    description:
      "Reply, reply-all, or forward an existing email. Always confirm content with the user before calling.",
    parameters: {
      type: "object",
      properties: {
        emailId: {
          type: "string",
          description: "The ID of the email to reply to or forward",
        },
        text: {
          type: "string",
          description:
            "Reply/forward body in plain text. Do NOT include a signature — it is appended automatically.",
        },
        mode: {
          type: "string",
          enum: ["reply", "reply-all", "forward"],
          description: "Reply mode (default: reply)",
        },
        to: {
          type: "array",
          items: {
            type: "object",
            properties: {
              email: { type: "string" },
              name: { type: "string" },
            },
            required: ["email"],
          },
          description:
            "Override recipients. Required for forward. Optional for reply/reply-all.",
        },
      },
      required: ["emailId", "text"],
    },
  },
};

const CREATE_DRAFT_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "create_draft",
    description:
      "Save an email draft for the business owner to review and edit before sending. Use when the user says 'draft' or 'prepare'.",
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "array",
          items: {
            type: "object",
            properties: {
              email: { type: "string", description: "Recipient email address" },
              name: { type: "string", description: "Recipient display name" },
            },
            required: ["email"],
          },
          description: "List of recipients",
        },
        cc: {
          type: "array",
          items: {
            type: "object",
            properties: {
              email: { type: "string" },
              name: { type: "string" },
            },
            required: ["email"],
          },
          description: "CC recipients (optional)",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        bodyText: {
          type: "string",
          description: "Email body in plain text",
        },
        mode: {
          type: "string",
          enum: ["compose", "reply", "reply-all", "forward"],
          description: "Draft mode (default: compose)",
        },
        replyToEmailId: {
          type: "string",
          description:
            "The ID of the email being replied to (required when mode is reply/reply-all/forward)",
        },
      },
      required: ["to", "subject", "bodyText"],
    },
  },
};

export const ASSISTANT_TOOL_DEFINITIONS: ToolDefinition[] = [
  GET_DAILY_BRIEF_TOOL,
  GET_APPOINTMENTS_TOOL,
  CREATE_APPOINTMENT_TOOL,
  UPDATE_APPOINTMENT_TOOL,
  GET_RECENT_EMAILS_TOOL,
  GET_EMAIL_DETAIL_TOOL,
  GET_CUSTOMER_CONTEXT_TOOL,
  GET_EMAIL_THREAD_TOOL,
  SEND_EMAIL_TOOL,
  REPLY_TO_EMAIL_TOOL,
  CREATE_DRAFT_TOOL,
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
      case "create_appointment":
        return await executeCreateAppointment(tenantId, toolArgs, tenant, tz);
      case "update_appointment":
        return await executeUpdateAppointment(tenantId, toolArgs, tenant, tz);
      case "get_recent_emails":
        return await executeGetRecentEmails(tenantId, toolArgs, tz);
      case "get_email_detail":
        return await executeGetEmailDetail(tenantId, toolArgs, tz);
      case "get_customer_context":
        return await executeGetCustomerContext(tenantId, toolArgs, tz);
      case "get_email_thread":
        return await executeGetEmailThread(tenantId, toolArgs, tz);
      case "send_email":
        return await executeSendEmail(tenantId, toolArgs, tenant);
      case "reply_to_email":
        return await executeReplyToEmail(tenantId, toolArgs, tenant);
      case "create_draft":
        return await executeCreateDraft(tenantId, toolArgs);
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
 * create_appointment — create a new calendar event
 */
async function executeCreateAppointment(
  tenantId: string,
  toolArgs: string,
  tenant: CallyTenant,
  timezone: string,
): Promise<string> {
  const args = JSON.parse(toolArgs) as {
    title: string;
    startTime: string;
    endTime: string;
    description?: string;
    location?: string;
    notes?: string;
  };

  if (!args.title) {
    return JSON.stringify({ error: "title is required." });
  }
  if (!args.startTime || !args.endTime) {
    return JSON.stringify({ error: "startTime and endTime are required." });
  }

  // Validate dates
  const startDate = new Date(args.startTime);
  const endDate = new Date(args.endTime);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return JSON.stringify({
      error: "Invalid date format for startTime or endTime.",
    });
  }

  if (endDate <= startDate) {
    return JSON.stringify({ error: "endTime must be after startTime." });
  }

  console.log(
    `[DBG][assistant-tools] create_appointment: "${args.title}" at ${args.startTime}`,
  );

  const event = await createCalendarEvent(tenantId, {
    title: args.title,
    description: args.description,
    startTime: args.startTime,
    endTime: args.endTime,
    type: "general",
    location: args.location,
    notes: args.notes,
  });

  // Push to Google Calendar if configured (fire-and-forget)
  if (tenant.googleCalendarConfig) {
    pushCreateToGoogle(tenant, event).catch((err) =>
      console.warn("[DBG][assistant-tools] Google Calendar push failed:", err),
    );
  }

  // Push to Outlook Calendar if configured (fire-and-forget)
  if (tenant.outlookCalendarConfig) {
    pushCreateToOutlook(tenant, event).catch((err) =>
      console.warn("[DBG][assistant-tools] Outlook Calendar push failed:", err),
    );
  }

  console.log(`[DBG][assistant-tools] Created appointment: ${event.id}`);

  return JSON.stringify({
    success: true,
    appointment: formatEventSummary(event, timezone),
    message: `Appointment "${event.title}" created for ${formatDateTimeInTimezone(event.startTime, timezone)}.`,
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
 * get_recent_emails — list inbox emails with rich filters
 */
async function executeGetRecentEmails(
  tenantId: string,
  toolArgs: string,
  timezone: string,
): Promise<string> {
  const args = JSON.parse(toolArgs) as {
    limit?: number;
    unreadOnly?: boolean;
    starredOnly?: boolean;
    search?: string;
    folder?: "inbox" | "sent" | "trash" | "archive";
    from?: string;
    to?: string;
    hasAttachment?: boolean;
    after?: string;
    before?: string;
  };

  const result = await getEmailsByTenant(tenantId, {
    limit: args.limit || 10,
    unreadOnly: args.unreadOnly,
    starredOnly: args.starredOnly,
    search: args.search,
    folder: args.folder,
    from: args.from,
    to: args.to,
    hasAttachment: args.hasAttachment,
    after: args.after,
    before: args.before,
  });

  const emails = result.emails.map((e) => ({
    id: e.id,
    from: e.from.name ? `${e.from.name} <${e.from.email}>` : e.from.email,
    to: e.to.map((t) => (t.name ? `${t.name} <${t.email}>` : t.email)),
    subject: e.subject,
    receivedAt: formatDateTimeInTimezone(e.receivedAt, timezone),
    isRead: e.isRead,
    isStarred: e.isStarred,
    isOutgoing: e.isOutgoing,
    hasAttachments: e.attachments && e.attachments.length > 0,
    snippet: e.bodyText.slice(0, 120),
  }));

  console.log(
    `[DBG][assistant-tools] get_recent_emails: ${emails.length} emails (folder: ${args.folder || "inbox"})`,
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

/**
 * get_customer_context — aggregate a customer's full profile and history
 */
async function executeGetCustomerContext(
  tenantId: string,
  toolArgs: string,
  timezone: string,
): Promise<string> {
  const args = JSON.parse(toolArgs) as {
    customerEmail?: string;
    eventId?: string;
  };

  // Resolve the customer email
  let email: string | null = null;

  if (args.eventId) {
    const event = await getCalendarEventByIdOnly(tenantId, args.eventId);
    if (!event) {
      return JSON.stringify({
        error: `Event with ID "${args.eventId}" not found.`,
      });
    }
    const visitor = parseVisitorFromDescription(event.description);
    if (!visitor) {
      return JSON.stringify({
        error:
          "This event does not have visitor/booking information. Try providing a customerEmail instead.",
      });
    }
    email = visitor.visitorEmail;
  } else if (args.customerEmail) {
    email = args.customerEmail;
  }

  if (!email) {
    return JSON.stringify({
      error:
        "Please provide either a customerEmail or an eventId to look up the customer.",
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  console.log(
    `[DBG][assistant-tools] get_customer_context: fetching data for ${normalizedEmail}`,
  );

  // Fetch all data in parallel
  const [subscribers, events, emails, contacts, allFeedback] =
    await Promise.all([
      getSubscribersByTenant(tenantId),
      getTenantCalendarEvents(tenantId),
      getEmailsByContact(tenantId, normalizedEmail),
      getContactsByEmail(tenantId, normalizedEmail),
      getFeedbackByTenant(tenantId),
    ]);

  // Build CallyUser profile via merge
  const users = mergeSubscribersAndVisitors(subscribers, events, contacts);
  const user = users.find(
    (u) => u.email.toLowerCase().trim() === normalizedEmail,
  );

  // Filter bookings for this customer
  const bookings = events
    .filter((e) => {
      if (!e.title.startsWith("Booking:")) return false;
      const visitor = parseVisitorFromDescription(e.description);
      return visitor?.visitorEmail.toLowerCase().trim() === normalizedEmail;
    })
    .sort((a, b) => b.startTime.localeCompare(a.startTime));

  // Filter feedback for this customer
  const feedback = allFeedback.filter(
    (f) => f.recipientEmail.toLowerCase().trim() === normalizedEmail,
  );

  // Determine relationship
  const totalBookings = bookings.length;
  let relationship: "prospect" | "new" | "occasional" | "regular";
  if (totalBookings === 0) relationship = "prospect";
  else if (totalBookings === 1) relationship = "new";
  else if (totalBookings <= 3) relationship = "occasional";
  else relationship = "regular";

  // Compute sentiment from submitted feedback
  const submittedFeedback = feedback.filter(
    (f) => f.status === "submitted" && f.rating !== undefined,
  );
  const totalReviews = submittedFeedback.length;
  let sentiment: {
    overall: string;
    averageRating: number | null;
    totalReviews: number;
    ratingBreakdown: Record<string, number>;
  };

  if (totalReviews === 0) {
    sentiment = {
      overall: "no_feedback",
      averageRating: null,
      totalReviews: 0,
      ratingBreakdown: {},
    };
  } else {
    const sum = submittedFeedback.reduce((acc, f) => acc + (f.rating || 0), 0);
    const avg = sum / totalReviews;
    const breakdown: Record<string, number> = {};
    for (const f of submittedFeedback) {
      const key = String(f.rating);
      breakdown[key] = (breakdown[key] || 0) + 1;
    }
    sentiment = {
      overall: avg >= 4 ? "positive" : avg >= 3 ? "neutral" : "negative",
      averageRating: Math.round(avg * 10) / 10,
      totalReviews,
      ratingBreakdown: breakdown,
    };
  }

  // Last appointment
  const lastBooking = bookings[0] || null;
  const lastAppointment = lastBooking
    ? {
        date: formatDateTimeInTimezone(lastBooking.startTime, timezone),
        status: lastBooking.status,
        notes: lastBooking.notes || "",
        visitorNote:
          parseVisitorFromDescription(lastBooking.description)?.note || "",
      }
    : null;

  // Booking history (format each)
  const bookingHistory = bookings.map((e) => {
    const visitor = parseVisitorFromDescription(e.description);
    return {
      id: e.id,
      date: new Date(e.startTime).toLocaleDateString("en-CA", {
        timeZone: timezone,
      }),
      startTime: formatTimeInTimezone(e.startTime, timezone),
      endTime: formatTimeInTimezone(e.endTime, timezone),
      status: e.status,
      title: e.title,
      notes: e.notes || "",
      visitorNote: visitor?.note || "",
    };
  });

  // Recent emails (max 10)
  const recentEmails = emails.slice(0, 10).map((e) => {
    const isFromCustomer =
      e.from.email.toLowerCase().trim() === normalizedEmail;
    return {
      id: e.id,
      direction: isFromCustomer ? ("inbound" as const) : ("outbound" as const),
      from: e.from.name ? `${e.from.name} <${e.from.email}>` : e.from.email,
      subject: e.subject,
      snippet: e.bodyText.slice(0, 150),
      receivedAt: formatDateTimeInTimezone(e.receivedAt, timezone),
    };
  });

  // Feedback list
  const feedbackList = feedback.map((f) => ({
    id: f.id,
    status: f.status,
    rating: f.rating ?? null,
    message: f.message || "",
    createdAt: formatDateTimeInTimezone(f.createdAt, timezone),
    submittedAt: f.submittedAt
      ? formatDateTimeInTimezone(f.submittedAt, timezone)
      : null,
  }));

  // Contact submissions
  const contactSubmissions = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    message: c.message,
    submittedAt: formatDateTimeInTimezone(c.submittedAt, timezone),
  }));

  const result = {
    profile: user
      ? {
          email: user.email,
          name: user.name,
          type: user.userType,
          subscribedAt: user.subscribedAt || null,
          source: user.source || null,
        }
      : {
          email: normalizedEmail,
          name: "Unknown",
          type: "unknown",
          subscribedAt: null,
          source: null,
        },
    relationship,
    totalBookings,
    sentiment,
    lastAppointment,
    bookingHistory,
    recentEmails,
    feedback: feedbackList,
    contactSubmissions,
    totalEmails: emails.length,
    totalContacts: contacts.length,
  };

  console.log(
    `[DBG][assistant-tools] get_customer_context: ${normalizedEmail} — ${relationship}, ${totalBookings} bookings, ${emails.length} emails, ${feedback.length} feedback, ${contacts.length} contacts`,
  );

  return JSON.stringify(result);
}

/**
 * get_email_thread — fetch the full conversation thread for an email
 */
async function executeGetEmailThread(
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

  const threadId = email.threadId || email.id;
  const threadEmails = await getEmailThread(threadId);

  // If no thread entries found, return just the single email
  const messages = threadEmails.length > 0 ? threadEmails : [email];

  const result = messages.map((e) => ({
    id: e.id,
    from: e.from.name ? `${e.from.name} <${e.from.email}>` : e.from.email,
    to: e.to.map((t) => (t.name ? `${t.name} <${t.email}>` : t.email)),
    subject: e.subject,
    bodyText: e.bodyText,
    receivedAt: formatDateTimeInTimezone(e.receivedAt, timezone),
    isOutgoing: e.isOutgoing,
  }));

  console.log(
    `[DBG][assistant-tools] get_email_thread: ${result.length} messages for thread ${threadId}`,
  );

  return JSON.stringify({ threadId, messages: result });
}

/**
 * Extract the tenant's email signature config (if enabled).
 */
function getSignatureConfig(
  tenant: CallyTenant,
): EmailSignatureConfig | undefined {
  const sig = (tenant as unknown as Record<string, unknown>)
    .emailSignatureConfig as EmailSignatureConfig;
  if (sig?.enabled) return sig;
  return undefined;
}

/**
 * send_email — compose and send a new email from the business address
 */
async function executeSendEmail(
  tenantId: string,
  toolArgs: string,
  tenant: CallyTenant,
): Promise<string> {
  const args = JSON.parse(toolArgs) as {
    to: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    subject: string;
    text: string;
  };

  if (!args.to || args.to.length === 0) {
    return JSON.stringify({
      error: "At least one recipient (to) is required.",
    });
  }
  if (!args.subject) {
    return JSON.stringify({ error: "subject is required." });
  }
  if (!args.text) {
    return JSON.stringify({ error: "text body is required." });
  }

  const fromStr = getFromEmail(tenant);
  const fromEmailAddress = fromStr.match(/<(.+)>/)?.[1] || fromStr;
  const signature = getSignatureConfig(tenant);

  console.log(
    `[DBG][assistant-tools] send_email: to=${args.to.map((a) => a.email).join(", ")}, subject="${args.subject}"`,
  );

  const messageId = await sendOutgoingEmail({
    tenant,
    to: args.to.map((a) => a.email),
    cc: args.cc?.map((a) => a.email),
    bcc: args.bcc?.map((a) => a.email),
    subject: args.subject,
    text: args.text,
    signature,
  });

  // Store in inbox
  const now = new Date().toISOString();
  const newEmailId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  await createEmail({
    id: newEmailId,
    expertId: tenantId,
    messageId,
    from: {
      email: fromEmailAddress,
      name: tenant.emailDisplayName || tenant.name,
    },
    to: args.to,
    cc: args.cc,
    bcc: args.bcc,
    subject: args.subject,
    bodyText: args.text,
    attachments: [],
    receivedAt: now,
    isOutgoing: true,
    status: "sent",
  });

  console.log(
    `[DBG][assistant-tools] send_email: sent and stored as ${newEmailId}`,
  );

  return JSON.stringify({
    success: true,
    emailId: newEmailId,
    message: `Email sent to ${args.to.map((a) => a.email).join(", ")}`,
  });
}

/**
 * reply_to_email — reply, reply-all, or forward an existing email
 */
async function executeReplyToEmail(
  tenantId: string,
  toolArgs: string,
  tenant: CallyTenant,
): Promise<string> {
  const args = JSON.parse(toolArgs) as {
    emailId: string;
    text: string;
    mode?: "reply" | "reply-all" | "forward";
    to?: EmailAddress[];
  };

  if (!args.emailId) {
    return JSON.stringify({ error: "emailId is required." });
  }
  if (!args.text) {
    return JSON.stringify({ error: "text body is required." });
  }

  const mode = args.mode || "reply";

  const originalEmail = await findEmailById(args.emailId, tenantId);
  if (!originalEmail) {
    return JSON.stringify({
      error: `Email with ID "${args.emailId}" not found.`,
    });
  }

  if (mode === "forward" && (!args.to || args.to.length === 0)) {
    return JSON.stringify({
      error: "Forward requires at least one recipient in 'to'.",
    });
  }

  const fromStr = getFromEmail(tenant);
  const fromEmailAddress = fromStr.match(/<(.+)>/)?.[1] || fromStr;
  const signature = getSignatureConfig(tenant);

  // Determine recipients and subject
  let toAddresses: EmailAddress[];
  let ccAddresses: EmailAddress[] | undefined;
  let subject: string;

  switch (mode) {
    case "reply-all": {
      toAddresses = args.to || [originalEmail.from];
      const allRecipients = [
        ...(originalEmail.to || []),
        ...(originalEmail.cc || []),
      ].filter(
        (addr) => addr.email.toLowerCase() !== fromEmailAddress.toLowerCase(),
      );
      ccAddresses = allRecipients.length > 0 ? allRecipients : undefined;
      subject = originalEmail.subject.startsWith("Re: ")
        ? originalEmail.subject
        : `Re: ${originalEmail.subject}`;
      break;
    }
    case "forward": {
      toAddresses = args.to!;
      subject = originalEmail.subject.startsWith("Fwd: ")
        ? originalEmail.subject
        : `Fwd: ${originalEmail.subject}`;
      break;
    }
    default: {
      toAddresses = args.to || [originalEmail.from];
      subject = originalEmail.subject.startsWith("Re: ")
        ? originalEmail.subject
        : `Re: ${originalEmail.subject}`;
      break;
    }
  }

  // Build body (for forward, include original message)
  let bodyText = args.text;
  if (mode === "forward") {
    const fwdHeader = `\n\n---------- Forwarded message ----------\nFrom: ${originalEmail.from.name || ""} <${originalEmail.from.email}>\nDate: ${originalEmail.receivedAt}\nSubject: ${originalEmail.subject}\nTo: ${originalEmail.to.map((t) => t.email).join(", ")}\n\n`;
    bodyText = bodyText + fwdHeader + originalEmail.bodyText;
  }

  console.log(
    `[DBG][assistant-tools] reply_to_email: mode=${mode}, to=${toAddresses.map((a) => a.email).join(", ")}`,
  );

  const messageId = await sendOutgoingEmail({
    tenant,
    to: toAddresses.map((a) => a.email),
    cc: ccAddresses?.map((a) => a.email),
    subject,
    text: bodyText,
    signature,
    inReplyTo: mode !== "forward" ? originalEmail.messageId : undefined,
    references: mode !== "forward" ? [originalEmail.messageId] : undefined,
  });

  // Thread handling
  const now = new Date().toISOString();
  const newEmailId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  let threadId: string | undefined;

  if (mode !== "forward") {
    threadId = originalEmail.threadId || originalEmail.id;
    if (!originalEmail.threadId) {
      await updateEmailThreadId(originalEmail.id, tenantId, threadId);
    }
  }

  await createEmail({
    id: newEmailId,
    expertId: tenantId,
    messageId,
    threadId,
    inReplyTo: mode !== "forward" ? originalEmail.messageId : undefined,
    from: {
      email: fromEmailAddress,
      name: tenant.emailDisplayName || tenant.name,
    },
    to: toAddresses,
    cc: ccAddresses,
    subject,
    bodyText,
    attachments: [],
    receivedAt: now,
    isOutgoing: true,
    status: "sent",
  });

  console.log(
    `[DBG][assistant-tools] reply_to_email: sent and stored as ${newEmailId}`,
  );

  const action =
    mode === "forward"
      ? "Forwarded"
      : mode === "reply-all"
        ? "Replied-all"
        : "Replied";
  return JSON.stringify({
    success: true,
    emailId: newEmailId,
    message: `${action} to ${toAddresses.map((a) => a.email).join(", ")}`,
  });
}

/**
 * create_draft — save an email draft for the business owner to review
 */
async function executeCreateDraft(
  tenantId: string,
  toolArgs: string,
): Promise<string> {
  const args = JSON.parse(toolArgs) as {
    to: EmailAddress[];
    cc?: EmailAddress[];
    subject: string;
    bodyText: string;
    mode?: "compose" | "reply" | "reply-all" | "forward";
    replyToEmailId?: string;
  };

  if (!args.to || args.to.length === 0) {
    return JSON.stringify({
      error: "At least one recipient (to) is required.",
    });
  }
  if (!args.subject) {
    return JSON.stringify({ error: "subject is required." });
  }
  if (!args.bodyText) {
    return JSON.stringify({ error: "bodyText is required." });
  }

  const draftId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const mode = args.mode || "compose";

  console.log(
    `[DBG][assistant-tools] create_draft: mode=${mode}, to=${args.to.map((a) => a.email).join(", ")}`,
  );

  const draft = await createDraft(tenantId, {
    id: draftId,
    expertId: tenantId,
    to: args.to,
    cc: args.cc,
    subject: args.subject,
    bodyText: args.bodyText,
    mode,
    replyToEmailId: args.replyToEmailId,
  });

  console.log(`[DBG][assistant-tools] create_draft: saved as ${draftId}`);

  return JSON.stringify({
    success: true,
    draftId: draft.id,
    message: `Draft saved. The business owner can review and send it from the Drafts folder in the inbox.`,
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
    `3. **create_appointment** — Create a new appointment/calendar event. Requires title, startTime, endTime (ISO 8601). Supports description, location, notes. Always confirm details with the user before creating.`,
  );
  parts.push(
    `4. **update_appointment** — Update an existing appointment's status, notes, time, or title. Always confirm with the user before executing changes.`,
  );
  parts.push(
    `5. **get_recent_emails** — List emails with rich filtering: search, folder (inbox/sent/trash/archive), from, to, date range (after/before), starredOnly, hasAttachment, unreadOnly.`,
  );
  parts.push(
    `6. **get_email_detail** — Get the full content of a specific email by ID.`,
  );
  parts.push(
    `7. **get_customer_context** — Get comprehensive context about a customer: profile, booking history, emails, reviews/feedback, and contact submissions. Accepts a customer email or event/booking ID.`,
  );
  parts.push(
    `8. **get_email_thread** — Fetch the full conversation thread for an email. Use before replying to understand context.`,
  );
  parts.push(
    `9. **send_email** — Compose and send a new email from the business address. Requires to, subject, text. Supports cc and bcc.`,
  );
  parts.push(
    `10. **reply_to_email** — Reply, reply-all, or forward an existing email. Requires emailId and text. Set mode to "reply", "reply-all", or "forward". Forward requires a "to" list.`,
  );
  parts.push(
    `11. **create_draft** — Save an email draft for the owner to review in the Drafts folder. Requires to, subject, bodyText.`,
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
    `- When asked to create/add/schedule a new appointment, use create_appointment. ALWAYS confirm the details (title, date, time) with the user before creating. Use the business timezone for interpreting times. NEVER use update_appointment to create new events.`,
  );
  parts.push(
    `- When asked to cancel, reschedule, or update an existing appointment, ALWAYS confirm the details with the user before calling update_appointment.`,
  );
  parts.push(
    `- When asked about emails or the inbox, call get_recent_emails. Use the rich filter parameters (from, search, folder, etc.) when appropriate. If the user wants to read a specific email, call get_email_detail.`,
  );
  parts.push(
    `- When asked about a customer or to prepare for an appointment, call get_customer_context with their email or the event ID.`,
  );
  parts.push(
    `- When appointment results include attendee info, proactively offer to look up the customer's history using get_customer_context.`,
  );
  parts.push(
    `- After fetching customer context, use the returned data for follow-up questions without re-calling the tool.`,
  );
  parts.push(
    `- Classify customers as: prospect (0 bookings), new (1), occasional (2-3), regular (4+).`,
  );

  // Email workflow instructions
  parts.push(`\nEMAIL WORKFLOW:`);
  parts.push(
    `- Before calling send_email or reply_to_email, ALWAYS show the draft content (recipients, subject, body) to the user and get explicit confirmation.`,
  );
  parts.push(
    `- Before replying to an email, use get_email_thread to understand the full conversation context.`,
  );
  parts.push(
    `- When the user says "draft", "prepare", or "save for later", use create_draft instead of send_email. Inform them the draft is in the Drafts folder.`,
  );
  parts.push(
    `- Do NOT include an email signature in the body text — it is automatically appended by the system.`,
  );
  parts.push(
    `- Use get_recent_emails with folder="sent" to find sent emails, and the from/to/search filters to narrow results.`,
  );

  // General instructions
  parts.push(`\nGENERAL:`);
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

  const isBooking = event.title.startsWith("Booking:");
  const visitor = isBooking
    ? parseVisitorFromDescription(event.description)
    : null;

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
    ...(visitor && {
      attendee: {
        name: visitor.visitorName,
        email: visitor.visitorEmail,
        note: visitor.note || "",
      },
    }),
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
