"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@core/hooks";

const STORAGE_KEY = "cally_visitor_info";

export interface VisitorInfo {
  name: string;
  email: string;
  timezone: string;
}

const getDefaultInfo = (): VisitorInfo => ({
  name: "",
  email: "",
  timezone:
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "Australia/Sydney",
});

/**
 * Hook to manage visitor info in localStorage.
 * Pre-fills forms with name/email/timezone from past submissions.
 * Call `saveVisitorInfo` after successful form submissions to remember the visitor.
 */
export function useVisitorInfo() {
  const [info, setInfo] = useLocalStorage<VisitorInfo>(
    STORAGE_KEY,
    getDefaultInfo(),
  );

  const saveVisitorInfo = useCallback(
    (updates: Partial<VisitorInfo>) => {
      setInfo((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(updates).filter(
            ([, v]) => v !== undefined && v !== "",
          ),
        ),
      }));
    },
    [setInfo],
  );

  return { visitorInfo: info, saveVisitorInfo };
}
