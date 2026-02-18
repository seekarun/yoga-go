"use client";

import { useState, useRef, useCallback } from "react";

interface UseDraggableOptions {
  x: number;
  y: number;
  onPositionChange: (x: number, y: number) => void;
  enabled?: boolean;
}

const DRAG_THRESHOLD = 4;

export default function useDraggable({
  x,
  y,
  onPositionChange,
  enabled = true,
}: UseDraggableOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentX, setCurrentX] = useState(x);
  const [currentY, setCurrentY] = useState(y);

  // Track latest position in a ref so mouseup can read it
  const posRef = useRef({ x: currentX, y: currentY });

  const startRef = useRef<{
    clientX: number;
    clientY: number;
    startX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);

  // Sync external position changes when not dragging
  const lastPropsRef = useRef({ x, y });
  if (lastPropsRef.current.x !== x || lastPropsRef.current.y !== y) {
    lastPropsRef.current = { x, y };
    if (!startRef.current) {
      setCurrentX(x);
      setCurrentY(y);
      posRef.current = { x, y };
    }
  }

  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;
      // Skip drag if clicking inside a focused contentEditable
      const target = e.target as HTMLElement;
      if (target.closest("[contenteditable]")?.contains(document.activeElement))
        return;

      e.preventDefault();
      startRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        startX: x,
        startY: y,
        dragging: false,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!startRef.current) return;
        const dx = moveEvent.clientX - startRef.current.clientX;
        const dy = moveEvent.clientY - startRef.current.clientY;

        if (
          !startRef.current.dragging &&
          Math.abs(dx) < DRAG_THRESHOLD &&
          Math.abs(dy) < DRAG_THRESHOLD
        ) {
          return;
        }

        if (!startRef.current.dragging) {
          startRef.current.dragging = true;
          setIsDragging(true);
        }

        const newX = startRef.current.startX + dx;
        const newY = startRef.current.startY + dy;
        setCurrentX(newX);
        setCurrentY(newY);
        posRef.current = { x: newX, y: newY };
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        if (startRef.current?.dragging) {
          const { x: finalX, y: finalY } = posRef.current;
          setIsDragging(false);
          startRef.current = null;
          onPositionChangeRef.current(finalX, finalY);
        } else {
          startRef.current = null;
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [enabled, x, y],
  );

  return { handleMouseDown, isDragging, currentX, currentY };
}
