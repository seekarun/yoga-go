"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface BgDragOverlayProps {
  active: boolean;
  offsetX: number;
  offsetY: number;
  imageZoom: number;
  onOffsetChange?: (x: number, y: number) => void;
  onZoomChange?: (zoom: number) => void;
}

export default function BgDragOverlay({
  active,
  offsetX,
  offsetY,
  imageZoom,
  onOffsetChange,
  onZoomChange,
}: BgDragOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: offsetX, y: offsetY });

  // Keep refs for callbacks to avoid stale closures in event listeners
  const onOffsetChangeRef = useRef(onOffsetChange);
  onOffsetChangeRef.current = onOffsetChange;
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  const zoomRef = useRef(imageZoom);
  zoomRef.current = imageZoom;

  // Sync offsetRef with props — only when NOT dragging
  useEffect(() => {
    if (dragging) return;
    offsetRef.current = { x: offsetX, y: offsetY };
  }, [offsetX, offsetY, dragging]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Mouse move + mouse up during drag
  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };

      offsetRef.current = {
        x: offsetRef.current.x + dx,
        y: offsetRef.current.y + dy,
      };

      onOffsetChangeRef.current?.(
        Math.round(offsetRef.current.x),
        Math.round(offsetRef.current.y),
      );
    };

    const onMouseUp = () => setDragging(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

  // Wheel-to-zoom (native listener for non-passive preventDefault)
  useEffect(() => {
    if (!active) return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -5 : 5;
      const newZoom = Math.max(100, Math.min(300, zoomRef.current + delta));
      onZoomChangeRef.current?.(newZoom);
    };

    overlay.addEventListener("wheel", onWheel, { passive: false });
    return () => overlay.removeEventListener("wheel", onWheel);
  }, [active]);

  if (!active) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        cursor: dragging ? "grabbing" : "grab",
      }}
    />
  );
}
