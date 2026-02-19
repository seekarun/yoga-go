"use client";

import { useState, useCallback, useRef } from "react";
import type { CallyUser } from "@/types";

interface UseContactsResult {
  contacts: CallyUser[];
  loaded: boolean;
  loading: boolean;
  fetchContacts: () => Promise<void>;
  searchContacts: (query: string) => CallyUser[];
}

export function useContacts(): UseContactsResult {
  const [contacts, setContacts] = useState<CallyUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  const fetchContacts = useCallback(async () => {
    if (loadedRef.current) return;
    setLoading(true);
    try {
      const res = await fetch("/api/data/app/subscribers");
      const data = await res.json();
      if (data.success && data.data) {
        setContacts(data.data);
      }
      loadedRef.current = true;
      setLoaded(true);
    } catch (err) {
      console.log("[DBG][useContacts] Failed to fetch contacts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchContacts = useCallback(
    (query: string): CallyUser[] => {
      if (!query || query.length < 2) return [];
      const lower = query.toLowerCase();
      return contacts
        .filter(
          (c) =>
            !c.anonymous &&
            (c.email.toLowerCase().includes(lower) ||
              c.name?.toLowerCase().includes(lower)),
        )
        .slice(0, 8);
    },
    [contacts],
  );

  return { contacts, loaded, loading, fetchContacts, searchContacts };
}
