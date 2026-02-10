/**
 * Google Calendar API client for Cally
 *
 * Provides functions to interact with Google Calendar:
 * - OAuth token management (refresh)
 * - CRUD operations on Google Calendar events
 * - Listing events for a date range
 */

import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import type { GoogleCalendarConfig } from "@/types/google-calendar";
import type { CalendarEvent } from "@/types";

const getClientId = () => process.env.GOOGLE_CLIENT_ID!;
const getClientSecret = () => process.env.GOOGLE_CLIENT_SECRET!;
const getRedirectUri = () =>
  `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/data/app/google-calendar/callback`;

/**
 * Build the Google OAuth2 consent URL
 */
export function buildGoogleOAuthUrl(tenantId: string): string {
  const oauth2Client = new google.auth.OAuth2(
    getClientId(),
    getClientSecret(),
    getRedirectUri(),
  );

  const state = Buffer.from(JSON.stringify({ tenantId })).toString("base64");

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string;
}> {
  const oauth2Client = new google.auth.OAuth2(
    getClientId(),
    getClientSecret(),
    getRedirectUri(),
  );

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Missing access_token or refresh_token from Google OAuth");
  }

  const tokenExpiry = tokens.expiry_date
    ? new Date(tokens.expiry_date).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString();

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiry,
  };
}

/**
 * Fetch the authenticated user's email from Google
 */
export async function fetchGoogleUserEmail(
  accessToken: string,
): Promise<string> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  if (!data.email) {
    throw new Error("Could not retrieve Google email");
  }

  return data.email;
}

/**
 * Refresh an access token using the refresh token
 */
export async function refreshAccessToken(
  config: GoogleCalendarConfig,
): Promise<GoogleCalendarConfig> {
  console.log("[DBG][google-calendar] Refreshing access token");

  const oauth2Client = new google.auth.OAuth2(
    getClientId(),
    getClientSecret(),
    getRedirectUri(),
  );

  oauth2Client.setCredentials({ refresh_token: config.refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh Google access token");
  }

  const tokenExpiry = credentials.expiry_date
    ? new Date(credentials.expiry_date).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString();

  return {
    ...config,
    accessToken: credentials.access_token,
    tokenExpiry,
  };
}

/**
 * Get an authenticated Google Calendar client.
 * Auto-refreshes the token if expired.
 * Returns the updated config (with new token if refreshed) and the calendar client.
 */
export async function getGoogleCalendarClient(
  config: GoogleCalendarConfig,
): Promise<{
  client: calendar_v3.Calendar;
  updatedConfig: GoogleCalendarConfig;
}> {
  let currentConfig = config;

  // Refresh token if expired or about to expire (within 5 min)
  const expiresAt = new Date(currentConfig.tokenExpiry).getTime();
  const bufferMs = 5 * 60 * 1000;

  if (Date.now() >= expiresAt - bufferMs) {
    console.log("[DBG][google-calendar] Token expired or expiring soon");
    currentConfig = await refreshAccessToken(currentConfig);
  }

  const oauth2Client = new google.auth.OAuth2(
    getClientId(),
    getClientSecret(),
    getRedirectUri(),
  );
  oauth2Client.setCredentials({
    access_token: currentConfig.accessToken,
    refresh_token: currentConfig.refreshToken,
  });

  const client = google.calendar({ version: "v3", auth: oauth2Client });

  return { client, updatedConfig: currentConfig };
}

/**
 * Revoke Google OAuth token
 */
export async function revokeGoogleToken(accessToken: string): Promise<void> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  try {
    await oauth2Client.revokeToken(accessToken);
    console.log("[DBG][google-calendar] Token revoked");
  } catch (error) {
    console.warn("[DBG][google-calendar] Token revocation failed:", error);
    // Non-critical — token may already be invalid
  }
}

/**
 * Convert a Cally CalendarEvent to a Google Calendar event resource
 */
function toGoogleEventResource(
  event: Pick<
    CalendarEvent,
    "title" | "description" | "startTime" | "endTime" | "location"
  >,
): calendar_v3.Schema$Event {
  return {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    start: {
      dateTime: event.startTime,
    },
    end: {
      dateTime: event.endTime,
    },
  };
}

/**
 * Create an event in Google Calendar
 * Returns the Google Calendar event ID and optional Meet link
 */
export async function createGoogleEvent(
  client: calendar_v3.Calendar,
  calendarId: string,
  event: Pick<
    CalendarEvent,
    "title" | "description" | "startTime" | "endTime" | "location"
  >,
  options?: { withMeetLink?: boolean },
): Promise<{ googleEventId: string; meetLink?: string }> {
  console.log("[DBG][google-calendar] Creating event:", event.title);

  const requestBody: calendar_v3.Schema$Event = toGoogleEventResource(event);

  if (options?.withMeetLink) {
    requestBody.conferenceData = {
      createRequest: {
        requestId: `cally_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const res = await client.events.insert({
    calendarId,
    requestBody,
    conferenceDataVersion: options?.withMeetLink ? 1 : undefined,
  });

  const googleEventId = res.data.id;
  if (!googleEventId) {
    throw new Error("Google Calendar did not return an event ID");
  }

  const meetLink = res.data.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === "video",
  )?.uri;

  console.log(
    "[DBG][google-calendar] Created event:",
    googleEventId,
    meetLink ? `with Meet: ${meetLink}` : "",
  );

  return { googleEventId, meetLink: meetLink || undefined };
}

/**
 * Update an event in Google Calendar
 */
export async function updateGoogleEvent(
  client: calendar_v3.Calendar,
  calendarId: string,
  googleEventId: string,
  event: Pick<
    CalendarEvent,
    "title" | "description" | "startTime" | "endTime" | "location"
  >,
): Promise<void> {
  console.log("[DBG][google-calendar] Updating event:", googleEventId);

  await client.events.update({
    calendarId,
    eventId: googleEventId,
    requestBody: toGoogleEventResource(event),
  });

  console.log("[DBG][google-calendar] Updated event:", googleEventId);
}

/**
 * Add a Google Meet link to an existing Google Calendar event.
 * Returns the Meet link if successful.
 */
export async function addMeetLinkToGoogleEvent(
  client: calendar_v3.Calendar,
  calendarId: string,
  googleEventId: string,
): Promise<string | undefined> {
  console.log(
    "[DBG][google-calendar] Adding Meet link to event:",
    googleEventId,
  );

  const res = await client.events.patch({
    calendarId,
    eventId: googleEventId,
    conferenceDataVersion: 1,
    requestBody: {
      conferenceData: {
        createRequest: {
          requestId: `cally_meet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const meetLink = res.data.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === "video",
  )?.uri;

  console.log("[DBG][google-calendar] Meet link added:", meetLink || "none");

  return meetLink || undefined;
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteGoogleEvent(
  client: calendar_v3.Calendar,
  calendarId: string,
  googleEventId: string,
): Promise<void> {
  console.log("[DBG][google-calendar] Deleting event:", googleEventId);

  await client.events.delete({
    calendarId,
    eventId: googleEventId,
  });

  console.log("[DBG][google-calendar] Deleted event:", googleEventId);
}

/**
 * List events from Google Calendar for a date range
 */
export async function listGoogleEvents(
  client: calendar_v3.Calendar,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<calendar_v3.Schema$Event[]> {
  console.log(
    "[DBG][google-calendar] Listing events from",
    timeMin,
    "to",
    timeMax,
  );

  const res = await client.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });

  const events = res.data.items || [];
  console.log("[DBG][google-calendar] Found", events.length, "Google events");
  return events;
}
