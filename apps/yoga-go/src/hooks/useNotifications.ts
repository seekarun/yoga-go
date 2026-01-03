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

const POLL_INTERVAL = 30000; // 30 seconds fallback

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
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const firebaseUnsubscribeRef = useRef<(() => void) | null>(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!expertId) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/data/app/expert/me/notifications?limit=20');
      const data = await response.json();

      if (data.success && data.data) {
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
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

      try {
        const response = await fetch(`/data/app/expert/me/notifications/${notificationId}/read`, {
          method: 'POST',
        });
        const data = await response.json();
        console.log('[DBG][useNotifications] markAsRead: API response:', data);

        if (data.success) {
          // Update local state - mark as read and decrement count
          setNotifications(prev => {
            const updated = prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n));
            console.log('[DBG][useNotifications] markAsRead: Updated notifications state');
            return updated;
          });
          setUnreadCount(prev => {
            const newCount = Math.max(0, prev - 1);
            console.log(
              '[DBG][useNotifications] markAsRead: Updated unread count from',
              prev,
              'to',
              newCount
            );
            return newCount;
          });
        } else {
          console.error('[DBG][useNotifications] markAsRead: API returned error:', data.error);
        }
      } catch (err) {
        console.error('[DBG][useNotifications] Error marking as read:', err);
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

              // Sort by createdAt descending
              firebaseNotifications.sort((a, b) => {
                const dateA = new Date(a.createdAt || '').getTime();
                const dateB = new Date(b.createdAt || '').getTime();
                return dateB - dateA;
              });

              // Merge with existing notifications (Firebase may have newer ones)
              // Only add NEW notifications from Firebase, don't update isRead status
              // The local state is the source of truth for read status
              setNotifications(prev => {
                const existingIds = new Set(prev.map(n => n.id));
                const newNotifications = firebaseNotifications.filter(n => !existingIds.has(n.id));

                if (newNotifications.length > 0) {
                  console.log(
                    '[DBG][useNotifications] Firebase: adding',
                    newNotifications.length,
                    'new notifications'
                  );
                  // Merge and sort - new notifications keep their isRead from Firebase
                  const merged = [...newNotifications, ...prev];
                  merged.sort((a, b) => {
                    const dateA = new Date(a.createdAt || '').getTime();
                    const dateB = new Date(b.createdAt || '').getTime();
                    return dateB - dateA;
                  });

                  // Update unread count only for truly new notifications
                  const newUnreadCount = newNotifications.filter(n => !n.isRead).length;
                  if (newUnreadCount > 0) {
                    console.log('[DBG][useNotifications] Adding new unread count:', newUnreadCount);
                    setUnreadCount(prevCount => prevCount + newUnreadCount);
                  }

                  return merged.slice(0, 50); // Keep max 50
                }
                return prev;
              });
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
      console.log('[DBG][useNotifications] Firebase not available, using polling only');
    }

    // Always setup polling as backup (every 30 seconds)
    console.log('[DBG][useNotifications] Setting up polling backup');
    pollIntervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);

    return () => {
      // Cleanup Firebase subscription
      if (firebaseUnsubscribeRef.current) {
        firebaseUnsubscribeRef.current();
        firebaseUnsubscribeRef.current = null;
      }
      // Cleanup polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
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
