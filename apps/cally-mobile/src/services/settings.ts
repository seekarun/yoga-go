import { API_BASE_URL, API_ENDPOINTS } from "../config/api";

export const SUPPORTED_TIMEZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Perth",
  "Australia/Adelaide",
  "Pacific/Auckland",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
] as const;

export interface Preferences {
  name: string;
  timezone: string;
}

interface PreferencesResponse {
  success: boolean;
  data?: Preferences;
  error?: string;
}

export async function fetchPreferences(
  accessToken: string,
): Promise<PreferencesResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.preferences}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.json();
}

export async function updateTimezone(
  timezone: string,
  accessToken: string,
): Promise<PreferencesResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.preferences}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ timezone }),
  });

  return response.json();
}
