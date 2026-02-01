/**
 * useNotifications Hook
 *
 * Provides real-time notification state for expert dashboard.
 * Uses Firebase RTDB for real-time updates with API fallback.
 *
 * Features:
 * - Real-time subscription via Firebase RTDB
 * - Falls back to polling if Firebase not configured
 * - Tracks unread count
 * - Mark as read (single or all)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Notification } from '@/types';
import { database, ref, onValue, off, isFirebaseConfigured } from '@/lib/firebase';

export interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
  isRealtime: boolean;
}

export function useNotifications(expertId: string | null): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const firebaseUnsubscribeRef = useRef<(() => void) | null>(null);

  // Track IDs of notifications we've marked as read locally (to ignore stale Firebase data)
  const markedAsReadIdsRef = useRef<Set<string>>(new Set());
  // Track current notification IDs for Firebase comparison
  const notificationIdsRef = useRef<Set<string>>(new Set());
  // Cooldown to prevent refetch right after marking as read
  const lastMarkAsReadRef = useRef<number>(0);

  // Keep notificationIdsRef in sync with notifications state
  useEffect(() => {
    notificationIdsRef.current = new Set(notifications.map(n => n.id));
  }, [notifications]);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!expertId) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    // Skip fetch if we just marked something as read (within last 2 seconds)
    // This prevents stale API data from overwriting optimistic updates
    const timeSinceMarkAsRead = Date.now() - lastMarkAsReadRef.current;
    if (timeSinceMarkAsRead < 2000) {
      console.log(
        '[DBG][useNotifications] Skipping fetch - recent markAsRead (',
        timeSinceMarkAsRead,
        'ms ago)'
      );
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/data/app/expert/me/notifications?limit=20');
      const data = await response.json();

      if (data.success && data.data) {
        // Apply locally marked-as-read status to fetched notifications
        const fetchedNotifications = (data.data.notifications || []).map(
          (n: { id: string; isRead: boolean }) => ({
            ...n,
            isRead: markedAsReadIdsRef.current.has(n.id) ? true : n.isRead,
          })
        );
        // Recalculate unread count respecting local marks
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
      console.error('[DBG][useNotifications] Error fetching notifications:', err);
      setError('Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, [expertId]);

  // Mark single notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!expertId) {
        console.log('[DBG][useNotifications] markAsRead: No expertId, returning');
        return;
      }

      console.log('[DBG][useNotifications] markAsRead: Starting for notification:', notificationId);

      // Set cooldown to prevent refetch from overwriting optimistic update
      lastMarkAsReadRef.current = Date.now();

      // Immediately update local state for instant UI feedback
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
        console.log('[DBG][useNotifications] markAsRead: API response:', data);

        if (!data.success) {
          console.error('[DBG][useNotifications] markAsRead: API returned error:', data.error);
          // Rollback on error
          markedAsReadIdsRef.current.delete(notificationId);
          setNotifications(prev =>
            prev.map(n => (n.id === notificationId ? { ...n, isRead: false } : n))
          );
          setUnreadCount(prev => prev + 1);
        }
      } catch (err) {
        console.error('[DBG][useNotifications] Error marking as read:', err);
        // Rollback on error
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
        // Update local state
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('[DBG][useNotifications] Error marking all as read:', err);
    }
  }, [expertId]);

  // Setup Firebase real-time subscription
  useEffect(() => {
    if (!expertId) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    console.log('[DBG][useNotifications] Setting up for expertId:', expertId);
    console.log(
      '[DBG][useNotifications] Firebase configured:',
      isFirebaseConfigured,
      'database:',
      !!database
    );

    // Initial fetch from API (source of truth)
    fetchNotifications();

    // Try to setup Firebase real-time subscription
    if (isFirebaseConfigured && database) {
      try {
        const notificationsRef = ref(database, `notifications/${expertId}`);
        console.log(
          '[DBG][useNotifications] Subscribing to Firebase path: notifications/' + expertId
        );

        const unsubscribe = onValue(
          notificationsRef,
          snapshot => {
            console.log(
              '[DBG][useNotifications] Firebase snapshot received, exists:',
              snapshot.exists()
            );
            if (snapshot.exists()) {
              const data = snapshot.val();
              const firebaseNotifications: Notification[] = Object.values(data || {});
              console.log(
                '[DBG][useNotifications] Firebase notifications count:',
                firebaseNotifications.length
              );

              // Only consider VERY RECENT notifications from Firebase (within last 2 minutes)
              // This prevents stale Firebase data from overriding the API source of truth
              const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
              const recentFirebaseNotifications = firebaseNotifications.filter(n => {
                const createdAt = new Date(n.createdAt || '').getTime();
                return createdAt > twoMinutesAgo;
              });

              console.log(
                '[DBG][useNotifications] Recent Firebase notifications:',
                recentFirebaseNotifications.length
              );

              if (recentFirebaseNotifications.length === 0) {
                setIsLoading(false);
                return;
              }

              // Sort by createdAt descending
              recentFirebaseNotifications.sort((a, b) => {
                const dateA = new Date(a.createdAt || '').getTime();
                const dateB = new Date(b.createdAt || '').getTime();
                return dateB - dateA;
              });

              // Check if there are truly new notifications from Firebase
              const newNotifications = recentFirebaseNotifications.filter(
                n => !notificationIdsRef.current.has(n.id) && !markedAsReadIdsRef.current.has(n.id)
              );

              if (newNotifications.length > 0) {
                console.log(
                  '[DBG][useNotifications] Firebase: detected',
                  newNotifications.length,
                  'new notifications, refetching from API'
                );
                // Refetch from API to get accurate count (API is source of truth)
                fetchNotifications();
              }
            }
            setIsLoading(false);
          },
          error => {
            console.error('[DBG][useNotifications] Firebase error:', error);
            // Fall back to polling on error
            setIsRealtime(false);
          }
        );

        firebaseUnsubscribeRef.current = () => off(notificationsRef);
        setIsRealtime(true);
        console.log('[DBG][useNotifications] Firebase real-time subscription active');
      } catch (err) {
        console.error('[DBG][useNotifications] Failed to setup Firebase:', err);
        setIsRealtime(false);
      }
    } else {
      console.log('[DBG][useNotifications] Firebase not available');
    }

    return () => {
      // Cleanup Firebase subscription
      if (firebaseUnsubscribeRef.current) {
        firebaseUnsubscribeRef.current();
        firebaseUnsubscribeRef.current = null;
      }
    };
  }, [expertId, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
    isRealtime,
  };
}
