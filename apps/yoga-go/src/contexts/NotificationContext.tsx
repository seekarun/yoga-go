'use client';

/**
 * NotificationContext
 *
 * Global context for real-time notifications.
 * Provides notification state to all components (header, sidebar, pages).
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Notification } from '@/types';
import { database, ref, onValue, off, isFirebaseConfigured } from '@/lib/firebase';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  unreadEmailCount: number;
  unreadMessageCount: number;
  isLoading: boolean;
  error: string | null;
  isRealtime: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
  expertId: string | null;
}

export function NotificationProvider({ children, expertId }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
    notificationIdsRef.current = new Set(notifications.map(n => n.id));
  }, [notifications]);

  // Calculate unread email count
  const unreadEmailCount = notifications.filter(
    n => n.type === 'email_received' && !n.isRead
  ).length;

  // Calculate unread message count (forum threads and replies)
  const unreadMessageCount = notifications.filter(
    n => (n.type === 'forum_thread' || n.type === 'forum_reply') && !n.isRead
  ).length;

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!expertId) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    // Skip fetch if we just marked something as read (within last 2 seconds)
    const timeSinceMarkAsRead = Date.now() - lastMarkAsReadRef.current;
    if (timeSinceMarkAsRead < 2000) {
      console.log('[DBG][NotificationContext] Skipping fetch - recent markAsRead');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/data/app/expert/me/notifications?limit=50');
      const data = await response.json();

      if (data.success && data.data) {
        // Apply locally marked-as-read status
        const fetchedNotifications = (data.data.notifications || []).map(
          (n: { id: string; isRead: boolean }) => ({
            ...n,
            isRead: markedAsReadIdsRef.current.has(n.id) ? true : n.isRead,
          })
        );
        const actualUnreadCount = fetchedNotifications.filter(
          (n: { id: string; isRead: boolean }) => !n.isRead
        ).length;

        setNotifications(fetchedNotifications);
        setUnreadCount(actualUnreadCount);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch notifications');
      }
    } catch (err) {
      console.error('[DBG][NotificationContext] Error fetching:', err);
      setError('Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, [expertId]);

  // Mark single notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!expertId) return;

      console.log('[DBG][NotificationContext] markAsRead:', notificationId);

      // Set cooldown
      lastMarkAsReadRef.current = Date.now();

      // Optimistic update
      markedAsReadIdsRef.current.add(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      try {
        const response = await fetch(`/data/app/expert/me/notifications/${notificationId}/read`, {
          method: 'POST',
        });
        const data = await response.json();

        if (!data.success) {
          // Rollback
          markedAsReadIdsRef.current.delete(notificationId);
          setNotifications(prev =>
            prev.map(n => (n.id === notificationId ? { ...n, isRead: false } : n))
          );
          setUnreadCount(prev => prev + 1);
        }
      } catch (err) {
        console.error('[DBG][NotificationContext] Error marking as read:', err);
        // Rollback
        markedAsReadIdsRef.current.delete(notificationId);
        setNotifications(prev =>
          prev.map(n => (n.id === notificationId ? { ...n, isRead: false } : n))
        );
        setUnreadCount(prev => prev + 1);
      }
    },
    [expertId]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!expertId) return;

    try {
      const response = await fetch('/data/app/expert/me/notifications/read-all', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('[DBG][NotificationContext] Error marking all as read:', err);
    }
  }, [expertId]);

  // Setup Firebase subscription
  useEffect(() => {
    if (!expertId) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    console.log('[DBG][NotificationContext] Setting up for expertId:', expertId);

    // Initial fetch
    fetchNotifications();

    // Firebase real-time subscription
    if (isFirebaseConfigured && database) {
      try {
        const notificationsRef = ref(database, `notifications/${expertId}`);

        const unsubscribe = onValue(
          notificationsRef,
          snapshot => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              const firebaseNotifications: Notification[] = Object.values(data || {});

              // Only consider recent notifications (within 2 minutes)
              const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
              const recentNotifications = firebaseNotifications.filter(n => {
                const createdAt = new Date(n.createdAt || '').getTime();
                return createdAt > twoMinutesAgo;
              });

              // Check for truly new notifications
              const newNotifications = recentNotifications.filter(
                n => !notificationIdsRef.current.has(n.id) && !markedAsReadIdsRef.current.has(n.id)
              );

              if (newNotifications.length > 0) {
                console.log('[DBG][NotificationContext] New notifications detected, refetching');
                fetchNotifications();
              }
            }
            setIsLoading(false);
          },
          error => {
            console.error('[DBG][NotificationContext] Firebase error:', error);
            setIsRealtime(false);
          }
        );

        firebaseUnsubscribeRef.current = () => off(notificationsRef);
        setIsRealtime(true);
      } catch (err) {
        console.error('[DBG][NotificationContext] Failed to setup Firebase:', err);
        setIsRealtime(false);
      }
    }

    return () => {
      if (firebaseUnsubscribeRef.current) {
        firebaseUnsubscribeRef.current();
        firebaseUnsubscribeRef.current = null;
      }
    };
  }, [expertId, fetchNotifications]);

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    unreadEmailCount,
    unreadMessageCount,
    isLoading,
    error,
    isRealtime,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}

// Optional hook that returns null if not in provider (for components that may be outside)
export function useNotificationContextOptional() {
  return useContext(NotificationContext);
}
