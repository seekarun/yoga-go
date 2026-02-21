/**
 * NotificationContext for Cally Mobile
 *
 * Handles push token registration, polling for unread count,
 * and foreground notification display.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "./AuthContext";
import {
  registerForPushNotifications,
  registerPushToken,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notifications";
import type { CallyNotification } from "../services/notifications";

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationContextType {
  notifications: CallyNotification[];
  unreadCount: number;
  unreadEmailCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { accessToken, refreshAccessToken, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<CallyNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const pushTokenRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate unread email count
  const unreadEmailCount = notifications.filter(
    (n) => n.type === "email_received" && !n.isRead,
  ).length;

  // Fetch notifications
  const loadNotifications = useCallback(
    async (showLoader = false) => {
      if (!accessToken) return;

      if (showLoader) setIsLoading(true);

      try {
        let response = await fetchNotifications(accessToken);

        // Handle token expiry
        if (
          !response.success &&
          (response.error?.includes("expired") ||
            response.error?.includes("authenticated"))
        ) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            response = await fetchNotifications(newToken);
          }
        }

        if (response.success && response.data) {
          setNotifications(response.data.notifications);
          setUnreadCount(response.data.unreadCount);
        }
      } catch (error) {
        console.error("[DBG][NotificationContext] Error loading:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, refreshAccessToken],
  );

  // Mark single notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!accessToken) return;

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const success = await markNotificationRead(accessToken, notificationId);
      if (!success) {
        // Rollback
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: false } : n,
          ),
        );
        setUnreadCount((prev) => prev + 1);
      }
    },
    [accessToken],
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!accessToken) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    await markAllNotificationsRead(accessToken);
  }, [accessToken]);

  // Register push token when authenticated
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const setupPushToken = async () => {
      const token = await registerForPushNotifications();
      if (token) {
        pushTokenRef.current = token;
        await registerPushToken(accessToken, token);
      }
    };

    setupPushToken();
  }, [isAuthenticated, accessToken]);

  // Poll for notifications when app is in foreground
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Initial fetch
    loadNotifications(true);

    // Set up polling (every 30 seconds)
    pollIntervalRef.current = setInterval(() => {
      loadNotifications(false);
    }, 30000);

    // Pause polling when app is in background, resume when foreground
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          loadNotifications(false);
        }
      },
    );

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      appStateSubscription.remove();
    };
  }, [isAuthenticated, accessToken, loadNotifications]);

  // Listen for notification taps (background/killed state → opens app)
  useEffect(() => {
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log(
          "[DBG][NotificationContext] Notification tapped, data:",
          data,
        );
        // Navigation is handled by the navigator based on notification data
        // The app navigates to the relevant screen when opened
      });

    return () => {
      responseSubscription.remove();
    };
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    unreadEmailCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: () => loadNotifications(false),
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
