import { API_BASE_URL, API_ENDPOINTS } from "../config/api";

export interface CalendarItem {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  type: string;
  color: string;
  extendedProps?: {
    description?: string;
    meetingLink?: string;
    location?: string;
    status?: string;
    source?: string;
    attendees?: { name: string; email: string }[];
  };
}

interface CalendarResponse {
  success: boolean;
  data?: CalendarItem[];
  error?: string;
}

/**
 * Fetch calendar events for a date range
 */
export async function fetchCalendarEvents(
  accessToken: string,
  start: Date,
  end: Date,
): Promise<CalendarResponse> {
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.calendar}?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return response.json();
}

/**
 * Fetch today's calendar events
 */
export async function fetchTodayEvents(
  accessToken: string,
): Promise<CalendarResponse> {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  return fetchCalendarEvents(accessToken, startOfDay, endOfDay);
}
