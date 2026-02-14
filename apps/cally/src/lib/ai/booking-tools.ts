/**
 * Agent: Receptionist (visitor-facing)
 *
 * Tool definitions, executors, and system prompt builder for
 * visitor chat tool calling (list services, check availability, create bookings).
 */

import type { ToolDefinition } from "@/lib/openai";
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import type { CalendarEvent } from "@/types";
import type { BookingConfig } from "@/types/booking";
import { DEFAULT_BOOKING_CONFIG } from "@/types/booking";
import {
  getActiveProducts,
  getProductById,
} from "@/lib/repositories/productRepository";
import { getCalendarEventsByDateRange } from "@/lib/repositories/calendarEventRepository";
import { createCalendarEvent } from "@/lib/repositories/calendarEventRepository";
import { generateAvailableSlots } from "@/lib/booking/availability";
import {
  getTenantById,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import {
  getGoogleCalendarClient,
  listGoogleEvents,
} from "@/lib/google-calendar";
import { sendBookingNotificationEmail } from "@/lib/email/bookingNotification";
import { getLandingPageUrl } from "@/lib/email/bookingNotification";
import { isValidEmail } from "@core/lib/email/validator";
import { pushCreateToGoogle } from "@/lib/google-calendar-sync";

// ============================================================
// Tool Definitions
// ============================================================

const LIST_SERVICES_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "list_services",
    description:
      "List the services/products offered by this business, including name, description, duration, and price.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

const CHECK_AVAILABILITY_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "check_availability",
    description:
      "Check available booking time slots for a specific date. Returns a list of available times.",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "The date to check availability for (YYYY-MM-DD format)",
        },
        productId: {
          type: "string",
          description:
            "Optional product/service ID to use its specific duration for slot generation",
        },
      },
      required: ["date"],
    },
  },
};

const CREATE_BOOKING_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "create_booking",
    description:
      "Create a booking appointment for a visitor. For free services this creates the booking directly. For paid services this returns a link to complete payment.",
    parameters: {
      type: "object",
      properties: {
        visitorName: {
          type: "string",
          description: "Full name of the person making the booking",
        },
        visitorEmail: {
          type: "string",
          description: "Email address of the person making the booking",
        },
        startTime: {
          type: "string",
          description:
            "Start time of the booking slot in ISO 8601 format (e.g. 2025-03-15T09:00:00.000Z)",
        },
        endTime: {
          type: "string",
          description:
            "End time of the booking slot in ISO 8601 format (e.g. 2025-03-15T09:30:00.000Z)",
        },
        productId: {
          type: "string",
          description: "Optional product/service ID for this booking",
        },
        note: {
          type: "string",
          description: "Optional note or message from the visitor",
        },
      },
      required: ["visitorName", "visitorEmail", "startTime", "endTime"],
    },
  },
};

export const BOOKING_TOOL_DEFINITIONS: ToolDefinition[] = [
  LIST_SERVICES_TOOL,
  CHECK_AVAILABILITY_TOOL,
  CREATE_BOOKING_TOOL,
];

// ============================================================
// Tool Executors
// ============================================================

/**
 * Execute a tool call by name, returning a JSON string result.
 */
export async function executeToolCall(
  tenantId: string,
  toolName: string,
  toolArgs: string,
  tenant: CallyTenant,
  visitorTimezone?: string,
): Promise<string> {
  console.log(
    `[DBG][booking-tools] Executing tool: ${toolName} for tenant: ${tenantId}`,
  );

  try {
    switch (toolName) {
      case "list_services":
        return await executeListServices(tenantId);
      case "check_availability":
        return await executeCheckAvailability(
          tenantId,
          toolArgs,
          tenant,
          visitorTimezone,
        );
      case "create_booking":
        return await executeCreateBooking(tenantId, toolArgs, tenant);
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    console.error(`[DBG][booking-tools] Error executing ${toolName}:`, error);
    return JSON.stringify({
      error: `Failed to execute ${toolName}. Please try again.`,
    });
  }
}

/**
 * list_services — returns active products for the tenant
 */
async function executeListServices(tenantId: string): Promise<string> {
  const products = await getActiveProducts(tenantId);

  if (products.length === 0) {
    return JSON.stringify({
      message:
        "This business offers general appointments. Ask about availability for a convenient time.",
      services: [],
    });
  }

  const services = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || "",
    durationMinutes: p.durationMinutes,
    price: p.price, // in cents
    priceFormatted: p.price === 0 ? "Free" : `$${(p.price / 100).toFixed(2)}`,
  }));

  console.log(
    `[DBG][booking-tools] list_services returned ${services.length} services`,
  );
  return JSON.stringify({ services });
}

/**
 * check_availability — returns available slots for a date
 * Replicates the logic from /api/data/tenants/[tenantId]/booking/slots
 */
async function executeCheckAvailability(
  tenantId: string,
  toolArgs: string,
  tenant: CallyTenant,
  visitorTimezone?: string,
): Promise<string> {
  const args = JSON.parse(toolArgs) as {
    date: string;
    productId?: string;
  };

  const { date, productId } = args;

  // Validate date format
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return JSON.stringify({
      error: "Invalid date format. Please use YYYY-MM-DD.",
    });
  }

  const bookingConfig: BookingConfig = {
    ...(tenant.bookingConfig ?? DEFAULT_BOOKING_CONFIG),
  };

  // Product-specific duration override
  if (productId) {
    const product = await getProductById(tenantId, productId);
    if (product && product.isActive) {
      bookingConfig.slotDurationMinutes = product.durationMinutes;
    }
  }

  // Fetch existing CallyGo events
  const existingEvents = await getCalendarEventsByDateRange(
    tenantId,
    date,
    date,
  );

  // Fetch Google Calendar events if configured to block slots
  let allEvents: CalendarEvent[] = existingEvents;
  const googleCalendarConfig = tenant.googleCalendarConfig;

  if (googleCalendarConfig?.blockBookingSlots) {
    try {
      const { client, updatedConfig } =
        await getGoogleCalendarClient(googleCalendarConfig);

      if (updatedConfig !== googleCalendarConfig) {
        await updateTenant(tenantId, {
          googleCalendarConfig: updatedConfig,
        });
      }

      const dateStart = `${date}T00:00:00Z`;
      const dateEnd = `${date}T23:59:59Z`;

      const googleEvents = await listGoogleEvents(
        client,
        updatedConfig.calendarId,
        dateStart,
        dateEnd,
      );

      const googleBlocking: CalendarEvent[] = googleEvents
        .filter((ge) => ge.start?.dateTime && ge.end?.dateTime)
        .map((ge) => ({
          id: `gcal_${ge.id}`,
          expertId: tenantId,
          title: ge.summary || "",
          date,
          startTime: ge.start!.dateTime!,
          endTime: ge.end!.dateTime!,
          duration: 0,
          type: "general" as const,
          status: "scheduled" as const,
          createdAt: "",
          updatedAt: "",
        }));

      allEvents = [...existingEvents, ...googleBlocking];

      console.log(
        `[DBG][booking-tools] check_availability added ${googleBlocking.length} Google blockers`,
      );
    } catch (error) {
      console.warn(
        "[DBG][booking-tools] Failed to fetch Google Calendar events:",
        error,
      );
    }
  }

  const slots = generateAvailableSlots(date, bookingConfig, allEvents);
  const availableSlots = slots.filter((s) => s.available);

  if (availableSlots.length === 0) {
    return JSON.stringify({
      date,
      timezone: bookingConfig.timezone,
      message: "No available slots for this date.",
      availableSlots: [],
    });
  }

  // Format slots as human-readable times in both timezones
  const bizTz = bookingConfig.timezone;
  const showVisitorTz =
    visitorTimezone && visitorTimezone !== bizTz ? visitorTimezone : null;

  const formattedSlots = availableSlots.map((s) => {
    const bizStart = formatTimeInTimezone(s.startTime, bizTz);
    const bizEnd = formatTimeInTimezone(s.endTime, bizTz);
    const slot: {
      startTime: string;
      endTime: string;
      displayBusiness: string;
      displayVisitor?: string;
    } = {
      startTime: s.startTime,
      endTime: s.endTime,
      displayBusiness: `${bizStart} – ${bizEnd} (${bizTz})`,
    };
    if (showVisitorTz) {
      const visStart = formatTimeInTimezone(s.startTime, showVisitorTz);
      const visEnd = formatTimeInTimezone(s.endTime, showVisitorTz);
      slot.displayVisitor = `${visStart} – ${visEnd} (${showVisitorTz})`;
    }
    return slot;
  });

  console.log(
    `[DBG][booking-tools] check_availability found ${availableSlots.length} slots for ${date}`,
  );

  return JSON.stringify({
    date,
    businessTimezone: bizTz,
    visitorTimezone: showVisitorTz || bizTz,
    availableSlots: formattedSlots,
  });
}

/**
 * create_booking — creates a free booking or returns payment link for paid
 * Replicates the logic from /api/data/tenants/[tenantId]/booking
 */
async function executeCreateBooking(
  tenantId: string,
  toolArgs: string,
  tenant: CallyTenant,
): Promise<string> {
  const args = JSON.parse(toolArgs) as {
    visitorName: string;
    visitorEmail: string;
    startTime: string;
    endTime: string;
    productId?: string;
    note?: string;
  };

  const { visitorName, visitorEmail, startTime, endTime, productId, note } =
    args;

  // Validate required fields
  if (!visitorName || !visitorEmail || !startTime || !endTime) {
    return JSON.stringify({
      error:
        "Missing required fields: visitorName, visitorEmail, startTime, endTime",
    });
  }

  // Validate email
  const emailValidation = await isValidEmail(visitorEmail);
  if (!emailValidation.valid) {
    return JSON.stringify({
      error:
        "The email address appears to be invalid. Please check and try again.",
    });
  }

  const bookingConfig: BookingConfig = {
    ...(tenant.bookingConfig ?? DEFAULT_BOOKING_CONFIG),
  };

  // Check product details
  let productName: string | undefined;
  let productColor: string | undefined;
  let productPrice = 0;
  if (productId) {
    const product = await getProductById(tenantId, productId);
    if (product && product.isActive) {
      bookingConfig.slotDurationMinutes = product.durationMinutes;
      productName = product.name;
      productColor = product.color;
      productPrice = product.price;
    }
  }

  // Paid booking → return link instead of creating event
  const requiresPayment =
    productId && productPrice > 0 && tenant.stripeConfig?.chargesEnabled;

  if (requiresPayment) {
    const landingPageUrl = getLandingPageUrl(tenant);
    const bookingUrl = `${landingPageUrl}?product=${productId}`;

    console.log(
      `[DBG][booking-tools] Paid booking — returning booking URL for product ${productId}`,
    );

    return JSON.stringify({
      requiresPayment: true,
      priceFormatted: `$${(productPrice / 100).toFixed(2)}`,
      productName,
      bookingUrl,
      message: `This is a paid service ($${(productPrice / 100).toFixed(2)}). Please complete the booking and payment using the link provided.`,
    });
  }

  // Re-validate slot availability (prevent double-booking)
  // Re-fetch tenant in case it changed
  const freshTenant = await getTenantById(tenantId);
  if (!freshTenant) {
    return JSON.stringify({ error: "Tenant not found" });
  }

  const startDate = new Date(startTime);
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: bookingConfig.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const date = dateFormatter.format(startDate);

  const existingEvents = await getCalendarEventsByDateRange(
    tenantId,
    date,
    date,
  );

  const slots = generateAvailableSlots(date, bookingConfig, existingEvents);
  const requestedSlot = slots.find(
    (s) => s.startTime === startTime && s.endTime === endTime,
  );

  if (!requestedSlot) {
    return JSON.stringify({
      error: "The requested time slot is not valid. Please check availability.",
    });
  }

  if (!requestedSlot.available) {
    return JSON.stringify({
      error:
        "The requested time slot is no longer available. Please choose another time.",
    });
  }

  // Build event description
  const description = [
    `Visitor: ${visitorName}`,
    `Email: ${visitorEmail}`,
    productName ? `Product: ${productName}` : null,
    note ? `Note: ${note}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const eventTitle = productName
    ? `Booking: ${visitorName} — ${productName}`
    : `Booking: ${visitorName}`;

  // Create the calendar event
  const event = await createCalendarEvent(tenantId, {
    title: eventTitle,
    description,
    startTime,
    endTime,
    date,
    type: "general",
    status: "pending",
    color: productColor || "#f59e0b",
    productId: productId || undefined,
  });

  console.log(
    `[DBG][booking-tools] Created booking event: ${event.id} for ${visitorName}`,
  );

  // Push to Google Calendar (fire-and-forget)
  pushCreateToGoogle(freshTenant, event).catch((err) =>
    console.warn("[DBG][booking-tools] Google push failed:", err),
  );

  // Send booking notification email (fire-and-forget)
  sendBookingNotificationEmail({
    visitorName,
    visitorEmail,
    note,
    startTime,
    endTime,
    date,
    tenant: freshTenant,
  }).catch((err) =>
    console.warn("[DBG][booking-tools] Notification email failed:", err),
  );

  // Format confirmation for the visitor
  const timezone = bookingConfig.timezone;
  const startFormatted = formatTimeInTimezone(startTime, timezone);
  const endFormatted = formatTimeInTimezone(endTime, timezone);
  const dateFormatted = formatDateInTimezone(startTime, timezone);

  return JSON.stringify({
    success: true,
    booking: {
      eventId: event.id,
      date: dateFormatted,
      time: `${startFormatted} – ${endFormatted}`,
      timezone,
      visitorName,
      visitorEmail,
      productName: productName || "General appointment",
    },
    message: `Booking created successfully! ${visitorName} is booked for ${dateFormatted} at ${startFormatted} – ${endFormatted} (${timezone}). A confirmation email has been sent to ${visitorEmail}.`,
  });
}

// ============================================================
// System Prompt Builder
// ============================================================

/**
 * Build a system prompt addition for tenants with booking enabled.
 * Fetches the product catalog so the AI knows available services upfront.
 * Returns null if tenant has no booking config.
 */
export async function buildBookingSystemPromptAddition(
  tenant: CallyTenant,
): Promise<string | null> {
  if (!tenant.bookingConfig) return null;

  const config = tenant.bookingConfig;
  const timezone = config.timezone;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  const lookaheadDays = config.lookaheadDays;

  // Fetch products upfront so the AI already knows the catalog
  const products = await getActiveProducts(tenant.id);

  let servicesSection: string;
  if (products.length === 0) {
    servicesSection =
      "This business offers general appointments (no specific services/products configured).";
  } else {
    const serviceLines = products
      .map((p) => {
        const priceStr =
          p.price === 0 ? "Free" : `$${(p.price / 100).toFixed(2)}`;
        const desc = p.description ? ` — ${p.description}` : "";
        return `  - "${p.name}" (ID: ${p.id}) | ${p.durationMinutes} min | ${priceStr}${desc}`;
      })
      .join("\n");
    servicesSection = `Available Services/Products:\n${serviceLines}`;
  }

  // Format business hours
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const scheduleLines = Object.entries(config.weeklySchedule)
    .map(([dayIndex, schedule]) => {
      const dayName = dayNames[Number(dayIndex)];
      if (!schedule.enabled) return `  ${dayName}: Closed`;
      const startFormatted = formatHour(schedule.startHour);
      const endFormatted = formatHour(schedule.endHour);
      return `  ${dayName}: ${startFormatted} – ${endFormatted}`;
    })
    .join("\n");

  return `
BOOKING CAPABILITIES:
You have access to the following tools for helping visitors book appointments:

1. **list_services** — Use this to show visitors what services/products are available (with latest pricing).
2. **check_availability** — Use this to check open time slots for a specific date.
3. **create_booking** — Use this to create a booking after collecting required info.

BOOKING CONTEXT:
- Timezone: ${timezone}
- Today's date: ${today}
- Visitors can book up to ${lookaheadDays} days in advance.
- Default appointment duration: ${config.slotDurationMinutes} minutes

${servicesSection}

Business Hours:
${scheduleLines}

BOOKING FLOW — follow these steps:
1. If the visitor mentions a service by name that matches one of the available services above, use that service (and its productId) directly. Do NOT ask them to pick a service again.
2. If the visitor asks to book but doesn't specify a service, or the service name is ambiguous, list the available services with their duration and price and ask them to pick one.
3. If the visitor mentions a date/time, call check_availability right away (pass the productId if known, so the correct duration is used for slot generation).
4. Once a slot is selected, check if you already have the visitor's name and email (from the VISITOR INFO section). If you do, skip asking and use those details directly. If not, ask for their name and email address.
5. Confirm all details (service, date, time, name, email) before calling create_booking.
6. For paid services, tell the visitor the price and provide the booking page link from create_booking.
7. For free services, confirm the booking was created and let them know a confirmation email is on its way.

IMPORTANT RULES:
- Always check availability before attempting to create a booking.
- Never make up or guess available times — always use check_availability.
- If a visitor asks about a date that is outside business hours or beyond the lookahead window, let them know politely.
- When presenting times, always show them in the business timezone (${timezone}).
- Keep the conversation natural — don't dump all slots at once, suggest a few good options.
- When there is only one service available and the visitor asks to book, assume they want that service — don't ask them to choose.`;
}

// ============================================================
// Helpers
// ============================================================

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
 * Format an ISO time string to a human-readable date in the given timezone.
 * e.g. "Monday, March 15, 2025"
 */
function formatDateInTimezone(isoString: string, timezone: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
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
