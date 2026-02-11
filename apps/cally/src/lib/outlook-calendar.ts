/**
 * Outlook Calendar API client for Cally
 *
 * Provides functions to interact with Microsoft Graph Calendar API:
 * - OAuth token management (exchange, refresh)
 * - CRUD operations on Outlook Calendar events
 *
 * Uses fetch() directly against Microsoft Graph API — no SDK dependency.
 */

import type { OutlookCalendarConfig } from "@/types/outlook-calendar";
import type { CalendarEvent } from "@/types";

const getClientId = () => process.env.OUTLOOK_CLIENT_ID!;
const getClientSecret = () => process.env.OUTLOOK_CLIENT_SECRET!;
const getRedirectUri = () =>
  `${process.env.NEXTAUTH_URL || "http://localhost:3113"}/api/data/app/outlook-calendar/callback`;

const MS_TOKEN_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const MS_AUTH_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const SCOPES = ["Calendars.ReadWrite", "User.Read", "offline_access"].join(" ");

/**
 * Build the Microsoft OAuth consent URL
 */
export function buildOutlookOAuthUrl(tenantId: string): string {
  const state = Buffer.from(JSON.stringify({ tenantId })).toString("base64");

  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: "code",
    redirect_uri: getRedirectUri(),
    response_mode: "query",
    scope: SCOPES,
    state,
    prompt: "consent",
  });

  return `${MS_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeOutlookCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string;
}> {
  console.log("[DBG][outlook-calendar] Exchanging code for tokens");

  const res = await fetch(MS_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      code,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
      scope: SCOPES,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[DBG][outlook-calendar] Token exchange failed:", errorText);
    throw new Error("Failed to exchange Outlook authorization code");
  }

  const data = await res.json();

  if (!data.access_token || !data.refresh_token) {
    throw new Error(
      "Missing access_token or refresh_token from Microsoft OAuth",
    );
  }

  const tokenExpiry = new Date(
    Date.now() + (data.expires_in || 3600) * 1000,
  ).toISOString();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiry,
  };
}

/**
 * Refresh an access token using the refresh token
 */
export async function refreshOutlookAccessToken(
  config: OutlookCalendarConfig,
): Promise<OutlookCalendarConfig> {
  console.log("[DBG][outlook-calendar] Refreshing access token");

  const res = await fetch(MS_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
      scope: SCOPES,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[DBG][outlook-calendar] Token refresh failed:", errorText);
    throw new Error("Failed to refresh Outlook access token");
  }

  const data = await res.json();

  if (!data.access_token) {
    throw new Error("Failed to refresh Outlook access token");
  }

  const tokenExpiry = new Date(
    Date.now() + (data.expires_in || 3600) * 1000,
  ).toISOString();

  return {
    ...config,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || config.refreshToken,
    tokenExpiry,
  };
}

/**
 * Fetch the authenticated user's email from Microsoft Graph
 */
export async function fetchOutlookUserEmail(
  accessToken: string,
): Promise<string> {
  const res = await fetch(`${GRAPH_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch Microsoft user info");
  }

  const data = await res.json();
  const email = data.mail || data.userPrincipalName;

  if (!email) {
    throw new Error("Could not retrieve Microsoft email");
  }

  return email;
}

/**
 * Get an authenticated Outlook client config.
 * Auto-refreshes the token if expired (within 5 min buffer).
 * Returns the updated config with a valid access token.
 */
export async function getOutlookClient(
  config: OutlookCalendarConfig,
): Promise<{ updatedConfig: OutlookCalendarConfig }> {
  let currentConfig = config;

  const expiresAt = new Date(currentConfig.tokenExpiry).getTime();
  const bufferMs = 5 * 60 * 1000;

  if (Date.now() >= expiresAt - bufferMs) {
    console.log("[DBG][outlook-calendar] Token expired or expiring soon");
    currentConfig = await refreshOutlookAccessToken(currentConfig);
  }

  return { updatedConfig: currentConfig };
}

/**
 * Convert a Cally CalendarEvent to an Outlook event body
 */
function toOutlookEventBody(
  event: Pick<
    CalendarEvent,
    "title" | "description" | "startTime" | "endTime" | "location" | "isAllDay"
  >,
): Record<string, unknown> {
  return {
    subject: event.title,
    body: {
      contentType: "text",
      content: event.description || "",
    },
    start: {
      dateTime: event.startTime,
      timeZone: "UTC",
    },
    end: {
      dateTime: event.endTime,
      timeZone: "UTC",
    },
    ...(event.location ? { location: { displayName: event.location } } : {}),
    ...(event.isAllDay !== undefined ? { isAllDay: event.isAllDay } : {}),
  };
}

/**
 * Create an event in Outlook Calendar
 * Returns the Outlook event ID
 */
export async function createOutlookEvent(
  config: OutlookCalendarConfig,
  event: Pick<
    CalendarEvent,
    "title" | "description" | "startTime" | "endTime" | "location" | "isAllDay"
  >,
): Promise<string> {
  console.log("[DBG][outlook-calendar] Creating event:", event.title);

  const res = await fetch(`${GRAPH_BASE}/me/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toOutlookEventBody(event)),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[DBG][outlook-calendar] Create event failed:", errorText);
    throw new Error("Failed to create Outlook event");
  }

  const data = await res.json();

  if (!data.id) {
    throw new Error("Outlook did not return an event ID");
  }

  console.log("[DBG][outlook-calendar] Created event:", data.id);
  return data.id;
}

/**
 * Update an event in Outlook Calendar
 */
export async function updateOutlookEvent(
  config: OutlookCalendarConfig,
  outlookEventId: string,
  event: Pick<
    CalendarEvent,
    "title" | "description" | "startTime" | "endTime" | "location" | "isAllDay"
  >,
): Promise<void> {
  console.log("[DBG][outlook-calendar] Updating event:", outlookEventId);

  const res = await fetch(`${GRAPH_BASE}/me/events/${outlookEventId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toOutlookEventBody(event)),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[DBG][outlook-calendar] Update event failed:", errorText);
    throw new Error("Failed to update Outlook event");
  }

  console.log("[DBG][outlook-calendar] Updated event:", outlookEventId);
}

/**
 * Delete an event from Outlook Calendar
 */
export async function deleteOutlookEvent(
  config: OutlookCalendarConfig,
  outlookEventId: string,
): Promise<void> {
  console.log("[DBG][outlook-calendar] Deleting event:", outlookEventId);

  const res = await fetch(`${GRAPH_BASE}/me/events/${outlookEventId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[DBG][outlook-calendar] Delete event failed:", errorText);
    throw new Error("Failed to delete Outlook event");
  }

  console.log("[DBG][outlook-calendar] Deleted event:", outlookEventId);
}

/**
 * Outlook event shape returned by Microsoft Graph calendarView
 */
export interface OutlookEvent {
  id: string;
  subject: string;
  body?: { content?: string; contentType?: string };
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  location?: { displayName?: string };
  isAllDay?: boolean;
}

/**
 * List events from Outlook Calendar for a date range
 * Uses /me/calendarView which expands recurring events
 */
export async function listOutlookEvents(
  config: OutlookCalendarConfig,
  timeMin: string,
  timeMax: string,
): Promise<OutlookEvent[]> {
  console.log(
    "[DBG][outlook-calendar] Listing events from",
    timeMin,
    "to",
    timeMax,
  );

  const params = new URLSearchParams({
    startDateTime: timeMin,
    endDateTime: timeMax,
    $top: "250",
    $orderby: "start/dateTime",
    $select: "id,subject,body,start,end,location,isAllDay",
  });

  const res = await fetch(
    `${GRAPH_BASE}/me/calendarView?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
    },
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[DBG][outlook-calendar] List events failed:", errorText);
    throw new Error("Failed to list Outlook events");
  }

  const data = await res.json();
  const events: OutlookEvent[] = data.value || [];

  console.log("[DBG][outlook-calendar] Found", events.length, "Outlook events");
  return events;
}
