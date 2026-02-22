"use client";

/**
 * NotificationContext for Cally
 *
 * Global context for real-time notifications.
 * Signs into Firebase Auth with a custom token (uid = tenantId)
 * then subscribes to RTDB for real-time delivery.
 * Falls back to polling if Firebase is unavailable.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { CallyNotification } from "@/types";
import {
  database,
  firebaseAuth,
  ref,
  onValue,
  off,
  isFirebaseConfigured,
  signInWithCustomToken,
} from "@/lib/firebase";

interface NotificationContextValue {
  notifications: CallyNotification[];
  unreadCount: number;
  unreadEmailCount: number;
  isLoading: boolean;
  error: string | null;
  isRealtime: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

interface NotificationProviderProps {
  children: React.ReactNode;
  tenantId: string;
}

/**
 * Fetch a Firebase custom token from the backend,
 * then sign into Firebase Auth so RTDB rules work.
 */
async function signInToFirebase(): Promise<boolean> {
  if (!firebaseAuth) return false;

  try {
    const response = await fetch("/api/data/app/notifications/firebase-token");
    const data = await response.json();

    if (!data.success || !data.data?.token) {
      console.error(
        "[DBG][NotificationContext] Failed to get Firebase token:",
        data.error,
      );
      return false;
    }

    await signInWithCustomToken(firebaseAuth, data.data.token);
    console.log("[DBG][NotificationContext] Signed into Firebase Auth");
    return true;
  } catch (error) {
    console.error("[DBG][NotificationContext] Firebase sign-in failed:", error);
    return false;
  }
}

export function NotificationProvider({
  children,
  tenantId,
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<CallyNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const firebaseUnsubscribeRef = useRef<(() => void) | null>(null);

  // Track IDs of notifications we've marked as read locally
  const markedAsReadIdsRef = useRef<Set<string>>(new Set());
  // Track current notification IDs for Firebase comparison
  const notificationIdsRef = useRef<Set<string>>(new Set());
  // Cooldown to prevent refetch right after marking as read
  const lastMarkAsReadRef = useRef<number>(0);

  // Keep notificationIdsRef in sync
  useEffect(() => {
    notificationIdsRef.current = new Set(notifications.map((n) => n.id));
  }, [notifications]);

  // Calculate unread email count
  const unreadEmailCount = notifications.filter(
    (n) => n.type === "email_received" && !n.isRead,
  ).length;

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!tenantId) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    // Skip fetch if we just marked something as read (within last 2 seconds)
    const timeSinceMarkAsRead = Date.now() - lastMarkAsReadRef.current;
    if (timeSinceMarkAsRead < 2000) {
      console.log(
        "[DBG][NotificationContext] Skipping fetch - recent markAsRead",
      );
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/data/app/notifications?limit=50");
      const data = await response.json();

      if (data.success && data.data) {
        // Apply locally marked-as-read status
        const fetchedNotifications = (data.data.notifications || []).map(
          (n: CallyNotification) => ({
            ...n,
            isRead: markedAsReadIdsRef.current.has(n.id) ? true : n.isRead,
          }),
        );
        const actualUnreadCount = fetchedNotifications.filter(
          (n: CallyNotification) => !n.isRead,
        ).length;

        setNotifications(fetchedNotifications);
        setUnreadCount(actualUnreadCount);
        setError(null);
      } else {
        setError(data.error || "Failed to fetch notifications");
      }
    } catch (err) {
      console.error("[DBG][NotificationContext] Error fetching:", err);
      setError("Failed to fetch notifications");
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  // Mark single notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!tenantId) return;

      console.log("[DBG][NotificationContext] markAsRead:", notificationId);

      // Set cooldown
      lastMarkAsReadRef.current = Date.now();

      // Optimistic update
      markedAsReadIdsRef.current.add(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        const response = await fetch(
          `/api/data/app/notifications/${notificationId}/read`,
          { method: "POST" },
        );
        const data = await response.json();

        if (!data.success) {
          // Rollback
          markedAsReadIdsRef.current.delete(notificationId);
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notificationId ? { ...n, isRead: false } : n,
            ),
          );
          setUnreadCount((prev) => prev + 1);
        }
      } catch (err) {
        console.error("[DBG][NotificationContext] Error marking as read:", err);
        // Rollback
        markedAsReadIdsRef.current.delete(notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: false } : n,
          ),
        );
        setUnreadCount((prev) => prev + 1);
      }
    },
    [tenantId],
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!tenantId) return;

    try {
      const response = await fetch("/api/data/app/notifications/read-all", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error(
        "[DBG][NotificationContext] Error marking all as read:",
        err,
      );
    }
  }, [tenantId]);

  // Subscribe to Firebase RTDB (called after Firebase Auth sign-in succeeds)
  const subscribeToFirebase = useCallback(() => {
    if (!database || !tenantId) return false;

    try {
      const notificationsRef = ref(database, `cally-notifications/${tenantId}`);

      console.log(
        "[DBG][NotificationContext] Subscribing to Firebase: cally-notifications/" +
          tenantId,
      );

      onValue(
        notificationsRef,
        (snapshot) => {
          console.log(
            "[DBG][NotificationContext] Firebase onValue fired, exists:",
            snapshot.exists(),
          );

          if (snapshot.exists()) {
            const data = snapshot.val();
            const firebaseNotifications: CallyNotification[] = Object.values(
              data || {},
            );

            // Only consider recent notifications (within 2 minutes)
            const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
            const recentNotifications = firebaseNotifications.filter((n) => {
              const createdAt = new Date(n.createdAt || "").getTime();
              return createdAt > twoMinutesAgo;
            });

            // Check for truly new notifications
            const newNotifications = recentNotifications.filter(
              (n) =>
                !notificationIdsRef.current.has(n.id) &&
                !markedAsReadIdsRef.current.has(n.id),
            );

            if (newNotifications.length > 0) {
              console.log(
                "[DBG][NotificationContext] New notifications:",
                newNotifications.length,
              );
              fetchNotifications();
            }
          }
          setIsLoading(false);
        },
        (firebaseError) => {
          console.error(
            "[DBG][NotificationContext] Firebase error:",
            firebaseError,
          );
          setIsRealtime(false);
        },
      );

      firebaseUnsubscribeRef.current = () => off(notificationsRef);
      setIsRealtime(true);
      return true;
    } catch (err) {
      console.error(
        "[DBG][NotificationContext] Firebase subscription failed:",
        err,
      );
      return false;
    }
  }, [tenantId, fetchNotifications]);

  // Main setup effect: authenticate with Firebase, subscribe, start polling
  useEffect(() => {
    if (!tenantId) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    console.log(
      "[DBG][NotificationContext] Setting up for tenantId:",
      tenantId,
    );

    // Initial fetch
    fetchNotifications();

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const setup = async () => {
      let firebaseConnected = false;

      // Sign into Firebase Auth, then subscribe to RTDB
      if (isFirebaseConfigured && database && firebaseAuth) {
        const signedIn = await signInToFirebase();
        if (signedIn && !cancelled) {
          firebaseConnected = subscribeToFirebase();
        } else if (!cancelled) {
          console.log(
            "[DBG][NotificationContext] Firebase auth failed, polling only",
          );
        }
      } else {
        console.log(
          "[DBG][NotificationContext] Firebase not available - isConfigured:",
          isFirebaseConfigured,
          "database:",
          !!database,
          "auth:",
          !!firebaseAuth,
        );
      }

      if (cancelled) return;

      // Polling fallback: faster when Firebase isn't connected
      pollInterval = setInterval(
        () => {
          fetchNotifications();
        },
        firebaseConnected ? 60000 : 30000,
      );
    };

    setup();

    return () => {
      cancelled = true;
      if (pollInterval) clearInterval(pollInterval);
      if (firebaseUnsubscribeRef.current) {
        firebaseUnsubscribeRef.current();
        firebaseUnsubscribeRef.current = null;
      }
    };
  }, [tenantId, fetchNotifications, subscribeToFirebase]);

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    unreadEmailCount,
    isLoading,
    error,
    isRealtime,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within NotificationProvider",
    );
  }
  return context;
}

export function useNotificationContextOptional() {
  return useContext(NotificationContext);
}
