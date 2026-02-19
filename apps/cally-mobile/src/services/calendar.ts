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

  const start = startOfDay.toISOString();
  const end = endOfDay.toISOString();

  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.calendar}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = await response.json();
  return data;
}
