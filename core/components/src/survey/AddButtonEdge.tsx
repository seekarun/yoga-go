"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";

export type EdgeAction = "multiple-choice" | "text" | "finish" | "delete";

export interface AddButtonEdgeData {
  onInsert: (
    edgeId: string,
    source: string,
    target: string,
    sourceHandle: string | null,
    action: EdgeAction,
  ) => void;
  readOnly: boolean;
  pathOffset?: number;
  approachOffset?: number;
  targetNodeTop?: number;
  targetNodeRight?: number;
  maxPathOffset?: number;
  /** Extra first-segment length so top options fan out further right than bottom ones */
  sourceSpreadOffset?: number;
  [key: string]: unknown;
}

const BASE_GAP = 20;
const BORDER_RADIUS = 8;
/** Minimum first horizontal segment length so the pencil icon never hides behind the node */
const MIN_FIRST_SEGMENT = 50;

/**
 * Build a direct 3-segment path when target is well to the right of source.
 *   source → right(midX) → down/up(targetY) → right(targetX)
 */
function buildDirectPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  pathOffset: number,
  sourceSpreadOffset: number,
): [string, number, number] {
  // Double the spread — long vertical runs need more horizontal separation
  // to keep dashed lines visually distinct.
  // Enforce minimum first-segment + sourceSpreadOffset so icons never overlap.
  const midX = Math.max(
    sourceX + MIN_FIRST_SEGMENT + sourceSpreadOffset,
    Math.min(sourceX + BASE_GAP + pathOffset * 2, targetX - BASE_GAP),
  );

  const r = Math.max(
    0,
    Math.min(
      BORDER_RADIUS,
      Math.abs(midX - sourceX) / 2,
      Math.abs(targetY - sourceY) / 2,
      Math.abs(targetX - midX) / 2,
    ),
  );

  const goingDown = targetY > sourceY;

  const path = goingDown
    ? [
        `M ${sourceX},${sourceY}`,
        `H ${midX - r}`,
        `Q ${midX},${sourceY} ${midX},${sourceY + r}`,
        `V ${targetY - r}`,
        `Q ${midX},${targetY} ${midX + r},${targetY}`,
        `H ${targetX}`,
      ].join(" ")
    : [
        `M ${sourceX},${sourceY}`,
        `H ${midX - r}`,
        `Q ${midX},${sourceY} ${midX},${sourceY - r}`,
        `V ${targetY + r}`,
        `Q ${midX},${targetY} ${midX + r},${targetY}`,
        `H ${targetX}`,
      ].join(" ");

  // Place label on the first horizontal segment (source → midX)
  const labelX = (sourceX + midX) / 2;
  const labelY = sourceY;

  return [path, labelX, labelY];
}

/**
 * Build a right-angle routed path from source (right handle) to target (left handle).
 *
 * 5-segment path that never crosses through nodes:
 *   source → right(VX) → down/up(HY) → left(LX) → down(targetY) → right(targetX)
 *
 * pathOffset     — shifts VX right  (bottom-most source = leftmost)
 * approachOffset — shifts HY up AND LX left  (bottom-most source = topmost & leftmost)
 */
function buildRoutedPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  pathOffset: number,
  approachOffset: number,
  targetNodeTop: number,
  targetNodeRight?: number,
  maxPathOffset?: number,
  sourceSpreadOffset = 0,
): [string, number, number] {
  // When target is well to the right, use a direct 3-segment path
  const horizontalGap = targetX - sourceX;
  if (horizontalGap > 2 * BASE_GAP) {
    return buildDirectPath(
      sourceX,
      sourceY,
      targetX,
      targetY,
      pathOffset,
      sourceSpreadOffset,
    );
  }

  // Right-side vertical X — anchored to target node's right edge when available.
  // Enforce minimum first-segment + sourceSpreadOffset so icons never overlap.
  const vx = Math.max(
    sourceX + MIN_FIRST_SEGMENT + sourceSpreadOffset,
    targetNodeRight != null && maxPathOffset != null
      ? Math.max(
          sourceX + BASE_GAP,
          targetNodeRight - (maxPathOffset - pathOffset),
        )
      : Math.max(sourceX, targetX) + BASE_GAP + pathOffset,
  );
  // Horizontal approach Y — above the TOP of the target node (not the handle)
  const hy = targetNodeTop - BASE_GAP - approachOffset;
  // Left-side vertical X — to the left of the target handle
  const lx = targetX - BASE_GAP - approachOffset;

  // Clamp border radius so it doesn't overshoot any segment
  const r = Math.max(
    0,
    Math.min(
      BORDER_RADIUS,
      Math.abs(vx - sourceX) / 2,
      Math.abs(hy - sourceY) / 2,
      Math.abs(vx - lx) / 2,
      Math.abs(targetY - hy) / 2,
      Math.abs(targetX - lx) / 2,
    ),
  );

  const goingDown = sourceY <= hy;

  let path: string;

  if (goingDown) {
    // source → right → down → left → down → right → target
    path = [
      `M ${sourceX},${sourceY}`,
      `H ${vx - r}`,
      `Q ${vx},${sourceY} ${vx},${sourceY + r}`,
      `V ${hy - r}`,
      `Q ${vx},${hy} ${vx - r},${hy}`,
      `H ${lx + r}`,
      `Q ${lx},${hy} ${lx},${hy + r}`,
      `V ${targetY - r}`,
      `Q ${lx},${targetY} ${lx + r},${targetY}`,
      `H ${targetX}`,
    ].join(" ");
  } else {
    // source → right → up → left → down → right → target
    path = [
      `M ${sourceX},${sourceY}`,
      `H ${vx - r}`,
      `Q ${vx},${sourceY} ${vx},${sourceY - r}`,
      `V ${hy + r}`,
      `Q ${vx},${hy} ${vx - r},${hy}`,
      `H ${lx + r}`,
      `Q ${lx},${hy} ${lx},${hy + r}`,
      `V ${targetY - r}`,
      `Q ${lx},${targetY} ${lx + r},${targetY}`,
      `H ${targetX}`,
    ].join(" ");
  }

  // Place label on the first horizontal segment (source → vx)
  const labelX = (sourceX + vx) / 2;
  const labelY = sourceY;

  return [path, labelX, labelY];
}

const btnWrapperStyle: CSSProperties = {
  position: "absolute",
  pointerEvents: "all",
};

const btnStyle: CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: "50%",
  background: "#fff",
  color: "var(--color-primary, #6366f1)",
  border: "1.5px solid var(--color-primary, #6366f1)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  lineHeight: 1,
  boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
};

const menuStyle: CSSProperties = {
  position: "absolute",
  top: 24,
  left: "50%",
  transform: "translateX(-50%)",
  background: "#fff",
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.16)",
  zIndex: 10,
  minWidth: 200,
  padding: "4px 0",
  border: "1px solid var(--color-border, #e5e7eb)",
};

const menuItemStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 500,
  background: "none",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
  color: "var(--text-main, #1f2937)",
};

const menuItemDeleteStyle: CSSProperties = {
  ...menuItemStyle,
  color: "#dc2626",
};

const menuSeparatorStyle: CSSProperties = {
  margin: "4px 0",
  border: "none",
  borderTop: "1px solid var(--color-border, #e5e7eb)",
};

function PencilIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export function AddButtonEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceHandleId,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const edgeData = data as AddButtonEdgeData | undefined;
  const pathOffset = edgeData?.pathOffset ?? 0;
  const approachOffset = edgeData?.approachOffset ?? 0;
  const targetNodeTop = edgeData?.targetNodeTop ?? targetY;
  const targetNodeRight = edgeData?.targetNodeRight;
  const maxPathOffset = edgeData?.maxPathOffset;
  const sourceSpreadOffset = edgeData?.sourceSpreadOffset ?? 0;

  const [edgePath, labelX, labelY] = buildRoutedPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    pathOffset,
    approachOffset,
    targetNodeTop,
    targetNodeRight,
    maxPathOffset,
    sourceSpreadOffset,
  );
  const readOnly = edgeData?.readOnly ?? true;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleAction = (action: EdgeAction) => {
    setMenuOpen(false);
    edgeData?.onInsert(id, source, target, sourceHandleId ?? null, action);
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {!readOnly && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            ref={menuRef}
            style={{
              ...btnWrapperStyle,
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <button
              style={btnStyle}
              title="Edit edge"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <PencilIcon />
            </button>
            {menuOpen && (
              <div style={menuStyle}>
                <button
                  style={menuItemStyle}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f3f4f6")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                  onClick={() => handleAction("multiple-choice")}
                >
                  Multiple choice question
                </button>
                <button
                  style={menuItemStyle}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f3f4f6")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                  onClick={() => handleAction("text")}
                >
                  Free text question
                </button>
                <button
                  style={menuItemStyle}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f3f4f6")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                  onClick={() => handleAction("finish")}
                >
                  Finish node
                </button>
                <hr style={menuSeparatorStyle} />
                <button
                  style={menuItemDeleteStyle}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#fef2f2")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                  onClick={() => handleAction("delete")}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
