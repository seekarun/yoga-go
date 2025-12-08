"use client";

import { createContext, useContext, useState, useEffect } from "react";

export interface EventTag {
  id: string;
  label: string;
  color: string; // hex color code
}

export interface Preferences {
  timezone: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  location: string;
  tags: EventTag[];
}

const DEFAULT_TAGS: EventTag[] = [
  { id: "work", label: "Work", color: "#3B82F6" },
  { id: "personal", label: "Personal", color: "#10B981" },
  { id: "meeting", label: "Meeting", color: "#8B5CF6" },
];

const DEFAULT_PREFERENCES: Preferences = {
  timezone:
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC",
  dateFormat: "MM/dd/yyyy",
  timeFormat: "12h",
  location: "",
  tags: DEFAULT_TAGS,
};

interface PreferencesContextType {
  preferences: Preferences;
  setPreferences: (prefs: Preferences) => void;
  updatePreference: <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) => void;
}

const PreferencesContext = createContext<PreferencesContextType | null>(null);

const STORAGE_KEY = "calel-preferences";

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [preferences, setPreferencesState] =
    useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferencesState({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error(
        "[DBG][PreferencesContext] Failed to load preferences:",
        error,
      );
    }
    setIsLoaded(true);
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (error) {
        console.error(
          "[DBG][PreferencesContext] Failed to save preferences:",
          error,
        );
      }
    }
  }, [preferences, isLoaded]);

  const setPreferences = (prefs: Preferences) => {
    setPreferencesState(prefs);
  };

  const updatePreference = <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) => {
    setPreferencesState((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <PreferencesContext.Provider
      value={{ preferences, setPreferences, updatePreference }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}
