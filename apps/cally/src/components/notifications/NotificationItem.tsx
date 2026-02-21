"use client";

import type { CallyNotification } from "@/types";

interface NotificationItemProps {
  notification: CallyNotification;
  onClick: (notification: CallyNotification) => void;
}

function getIcon(type: CallyNotification["type"]) {
  switch (type) {
    case "email_received":
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      );
    case "booking_created":
    case "booking_cancelled":
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    case "payment_received":
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "new_subscriber":
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
      );
    default:
      return (
        <svg
          className="w-5 h-5"
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
      );
  }
}

function getIconColor(type: CallyNotification["type"]) {
  switch (type) {
    case "email_received":
      return "text-blue-500 bg-blue-50";
    case "booking_created":
      return "text-green-500 bg-green-50";
    case "booking_cancelled":
      return "text-red-500 bg-red-50";
    case "payment_received":
      return "text-emerald-500 bg-emerald-50";
    case "new_subscriber":
      return "text-purple-500 bg-purple-50";
    default:
      return "text-gray-500 bg-gray-50";
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function NotificationItem({
  notification,
  onClick,
}: NotificationItemProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
        !notification.isRead ? "bg-blue-50/40" : ""
      }`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getIconColor(notification.type)}`}
      >
        {getIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm truncate ${
              !notification.isRead
                ? "font-semibold text-gray-900"
                : "text-gray-700"
            }`}
          >
            {notification.title}
          </p>
          <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {notification.message}
        </p>
      </div>
      {!notification.isRead && (
        <div className="flex-shrink-0 mt-2">
          <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
        </div>
      )}
    </button>
  );
}
