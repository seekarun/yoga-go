"use client";

import { useEffect, useState } from "react";

export type InlineToastType = "success" | "error" | "info" | "warning";

interface InlineToastProps {
  message: string;
  type: InlineToastType;
  duration?: number;
  onDismiss: () => void;
}

export default function InlineToast({
  message,
  type,
  duration = 4000,
  onDismiss,
}: InlineToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(enterTimer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onDismiss, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const typeStyles = {
    success: {
      bg: "bg-green-50 border-green-200",
      text: "text-green-800",
      icon: (
        <svg
          className="w-4 h-4 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ),
    },
    error: {
      bg: "bg-red-50 border-red-200",
      text: "text-red-800",
      icon: (
        <svg
          className="w-4 h-4 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ),
    },
    warning: {
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-800",
      icon: (
        <svg
          className="w-4 h-4 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    info: {
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-800",
      icon: (
        <svg
          className="w-4 h-4 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  };

  const styles = typeStyles[type];

  return (
    <div
      className={`
        ${styles.bg} ${styles.text} border
        px-3 py-2 rounded-lg
        flex items-center gap-2
        text-sm
        transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
      `}
    >
      <span className="flex-shrink-0">{styles.icon}</span>
      <span>{message}</span>
      <button
        onClick={() => {
          setIsLeaving(true);
          setTimeout(onDismiss, 300);
        }}
        className="ml-auto flex-shrink-0 hover:opacity-60 transition-opacity"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
