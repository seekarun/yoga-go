"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useNotificationContext } from "@/contexts/NotificationContext";
import type { CallyNotification } from "@/types";

export default function NotificationToast() {
  const router = useRouter();
  const { notifications } = useNotificationContext();
  const [toast, setToast] = useState<CallyNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const prevNotifIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentIds = new Set(notifications.map((n) => n.id));

    // Find new notifications (present in current but not in previous)
    const newNotifs = notifications.filter(
      (n) => !prevNotifIdsRef.current.has(n.id) && !n.isRead,
    );

    prevNotifIdsRef.current = currentIds;

    if (newNotifs.length > 0 && prevNotifIdsRef.current.size > 0) {
      // Show the most recent new notification
      const latest = newNotifs[0];
      setToast(latest);
      setIsVisible(true);

      // Auto-dismiss after 5 seconds
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setToast(null), 300);
      }, 5000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notifications]);

  if (!toast) return null;

  const handleClick = () => {
    if (toast.link) {
      router.push(toast.link);
    }
    setIsVisible(false);
    setTimeout(() => setToast(null), 300);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(() => setToast(null), 300);
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[100] transition-all duration-300 ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
      }`}
    >
      <button
        type="button"
        onClick={handleClick}
        className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm flex items-start gap-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {toast.title}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {toast.message}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </button>
    </div>
  );
}
