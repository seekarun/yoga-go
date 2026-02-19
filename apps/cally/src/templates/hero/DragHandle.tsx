"use client";

import { useRef, useCallback } from "react";

type HandlePosition =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

interface DragHandleProps {
  position: HandlePosition;
  /** "edge" = invisible strip along an edge (for section padding).
   *  "node" = small visible square at a point (for image resize). */
  mode?: "edge" | "node";
  onDragStart?: () => void;
  onDrag: (deltaX: number, deltaY: number) => void;
  onDragEnd: () => void;
}

const EDGE_THICKNESS = 12;
const NODE_SIZE = 10;
const NODE_HIT = 20;

const CURSOR_MAP: Record<HandlePosition, string> = {
  top: "ns-resize",
  bottom: "ns-resize",
  left: "ew-resize",
  right: "ew-resize",
  "top-left": "nwse-resize",
  "top-right": "nesw-resize",
  "bottom-left": "nesw-resize",
  "bottom-right": "nwse-resize",
};

function getEdgeStyles(position: HandlePosition): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    zIndex: 10,
    cursor: CURSOR_MAP[position],
  };
  switch (position) {
    case "top":
      return {
        ...base,
        top: -EDGE_THICKNESS / 2,
        left: 0,
        right: 0,
        height: `${EDGE_THICKNESS}px`,
      };
    case "bottom":
      return {
        ...base,
        bottom: -EDGE_THICKNESS / 2,
        left: 0,
        right: 0,
        height: `${EDGE_THICKNESS}px`,
      };
    case "left":
      return {
        ...base,
        top: 0,
        left: -EDGE_THICKNESS / 2,
        bottom: 0,
        width: `${EDGE_THICKNESS}px`,
      };
    case "right":
      return {
        ...base,
        top: 0,
        right: -EDGE_THICKNESS / 2,
        bottom: 0,
        width: `${EDGE_THICKNESS}px`,
      };
    default:
      return base;
  }
}

function getNodeStyles(position: HandlePosition): React.CSSProperties {
  // Shift outward by 5px so handles sit on the outline (outlineOffset 4px + 1px half-width)
  const offset = -(NODE_HIT / 2) - 5;
  const base: React.CSSProperties = {
    position: "absolute",
    zIndex: 10,
    width: `${NODE_HIT}px`,
    height: `${NODE_HIT}px`,
    cursor: CURSOR_MAP[position],
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  switch (position) {
    case "top":
      return { ...base, top: offset, left: "50%", marginLeft: offset };
    case "bottom":
      return { ...base, bottom: offset, left: "50%", marginLeft: offset };
    case "left":
      return { ...base, left: offset, top: "50%", marginTop: offset };
    case "right":
      return { ...base, right: offset, top: "50%", marginTop: offset };
    case "top-left":
      return { ...base, top: offset, left: offset };
    case "top-right":
      return { ...base, top: offset, right: offset };
    case "bottom-left":
      return { ...base, bottom: offset, left: offset };
    case "bottom-right":
      return { ...base, bottom: offset, right: offset };
  }
}

export default function DragHandle({
  position,
  mode = "edge",
  onDragStart,
  onDrag,
  onDragEnd,
}: DragHandleProps) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDragStart?.();
      startRef.current = { x: e.clientX, y: e.clientY };

      if (handleRef.current) {
        handleRef.current.setAttribute("data-dragging", "true");
      }

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!startRef.current) return;
        const deltaX = moveEvent.clientX - startRef.current.x;
        const deltaY = moveEvent.clientY - startRef.current.y;
        onDrag(deltaX, deltaY);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        startRef.current = null;

        if (handleRef.current) {
          handleRef.current.removeAttribute("data-dragging");
        }

        onDragEnd();
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onDragStart, onDrag, onDragEnd],
  );

  if (mode === "node") {
    return (
      <div
        ref={handleRef}
        style={getNodeStyles(position)}
        onMouseDown={handleMouseDown}
      >
        <div
          style={{
            width: `${NODE_SIZE}px`,
            height: `${NODE_SIZE}px`,
            backgroundColor: "#3b82f6",
            borderRadius: "50%",
            border: "2px solid #ffffff",
            boxShadow: "0 0 3px rgba(0,0,0,0.3)",
            flexShrink: 0,
          }}
        />
      </div>
    );
  }

  // Edge mode — invisible strip, highlights on hover/drag
  return (
    <div
      ref={handleRef}
      className="drag-handle"
      style={getEdgeStyles(position)}
      onMouseDown={handleMouseDown}
    >
      <div
        className="drag-handle-visual"
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "transparent",
          transition: "background-color 0.15s",
        }}
      />
      <style>{`
        .drag-handle:hover .drag-handle-visual {
          background-color: rgba(59, 130, 246, 0.3) !important;
        }
        .drag-handle[data-dragging="true"] .drag-handle-visual {
          background-color: rgba(59, 130, 246, 0.5) !important;
        }
      `}</style>
    </div>
  );
}
