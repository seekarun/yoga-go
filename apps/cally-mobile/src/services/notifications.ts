/**
 * Notification Service for Cally Mobile
 *
 * Handles push token registration, fetching notifications,
 * and marking notifications as read.
 */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { API_BASE_URL, API_ENDPOINTS } from "../config/api";

export interface CallyNotification {
  id: string;
  recipientId: string;
  type:
    | "email_received"
    | "booking_created"
    | "booking_cancelled"
    | "payment_received"
    | "new_subscriber"
    | "system";
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface NotificationListResponse {
  success: boolean;
  data?: {
    notifications: CallyNotification[];
    unreadCount: number;
    lastKey?: string;
  };
  error?: string;
}

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log(
      "[DBG][notifications] Push notifications not supported on emulator",
    );
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[DBG][notifications] Push permission not granted");
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  console.log(
    "[DBG][notifications] Got push token:",
    tokenData.data.substring(0, 30) + "...",
  );

  return tokenData.data;
}

/**
 * Register push token with the backend
 */
export async function registerPushToken(
  accessToken: string,
  pushToken: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.pushToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        token: pushToken,
        platform: Platform.OS,
      }),
    });

    const data = await response.json();
    if (data.success) {
      console.log("[DBG][notifications] Push token registered successfully");
      return true;
    }
    console.error(
      "[DBG][notifications] Failed to register push token:",
      data.error,
    );
    return false;
  } catch (error) {
    console.error("[DBG][notifications] Error registering push token:", error);
    return false;
  }
}

/**
 * Unregister push token from the backend (on logout)
 */
export async function unregisterPushToken(
  accessToken: string,
  pushToken: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.pushToken}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token: pushToken }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error(
      "[DBG][notifications] Error unregistering push token:",
      error,
    );
    return false;
  }
}

/**
 * Fetch notifications from the API
 */
export async function fetchNotifications(
  accessToken: string,
  limit = 50,
): Promise<NotificationListResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.notifications}?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return await response.json();
  } catch (error) {
    console.error("[DBG][notifications] Error fetching notifications:", error);
    return { success: false, error: "Failed to fetch notifications" };
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  accessToken: string,
  notificationId: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.notifications}/${notificationId}/read`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error(
      "[DBG][notifications] Error marking notification read:",
      error,
    );
    return false;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(
  accessToken: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.notifications}/read-all`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error(
      "[DBG][notifications] Error marking all notifications read:",
      error,
    );
    return false;
  }
}
