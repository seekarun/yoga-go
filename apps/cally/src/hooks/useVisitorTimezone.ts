"use client";

import { useLocalStorage } from "@core/hooks";

const STORAGE_KEY = "cally_visitor_timezone";

/**
 * Hook to manage the visitor's preferred timezone.
 * Auto-detects from browser on first visit, persists override in localStorage.
 *
 * @returns [timezone, setTimezone] tuple
 */
export function useVisitorTimezone(): [string, (tz: string) => void] {
  const browserTimezone =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "Australia/Sydney";

  const [timezone, setTimezone] = useLocalStorage<string>(
    STORAGE_KEY,
    browserTimezone,
  );

  return [timezone, setTimezone];
}
