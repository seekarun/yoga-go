"use client";

import { useEffect, useCallback, useRef } from "react";

export type EmbedMessageType =
  | "cally:ready"
  | "cally:close"
  | "cally:resize"
  | "cally:booked"
  | "cally:contacted";

interface EmbedMessage {
  type: EmbedMessageType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- postMessage payload can vary
  payload?: any;
}

/**
 * Post a message to the parent window (host page embedding the iframe)
 */
function postToParent(message: EmbedMessage): void {
  if (typeof window === "undefined") return;
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(message, "*");
  }
}

/**
 * Hook for embed widget ↔ parent page communication via postMessage.
 *
 * - Sends `cally:ready` on mount
 * - Sends `cally:resize` automatically when body size changes (ResizeObserver)
 * - Exposes `notifyClose`, `notifyBooked`, `notifyContacted` for explicit events
 */
export function useEmbedMessaging(widget: string) {
  const observerRef = useRef<ResizeObserver | null>(null);

  // Notify parent that the widget is ready
  useEffect(() => {
    postToParent({ type: "cally:ready", payload: { widget } });
  }, [widget]);

  // Auto-resize: observe body height and notify parent
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sendResize = () => {
      const height = document.body.scrollHeight;
      postToParent({ type: "cally:resize", payload: { height } });
    };

    // Send initial size
    sendResize();

    observerRef.current = new ResizeObserver(sendResize);
    observerRef.current.observe(document.body);

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const notifyClose = useCallback(() => {
    postToParent({ type: "cally:close" });
  }, []);

  const notifyBooked = useCallback(() => {
    postToParent({ type: "cally:booked" });
  }, []);

  const notifyContacted = useCallback(() => {
    postToParent({ type: "cally:contacted" });
  }, []);

  return { postToParent, notifyClose, notifyBooked, notifyContacted };
}
