"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { LINE_SPACING } from "./constants";

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
  highlighted?: boolean;
  firstSegment?: number;
  turnDirection?: "left" | "right" | "straight";
  lastSegment?: number;
  pathOffset?: number;
  approachOffset?: number;
  targetNodeLeft?: number;
  [key: string]: unknown;
}

const BASE_GAP = LINE_SPACING;
const BORDER_RADIUS = 8;
/** Minimum first vertical segment so the pencil icon sits below the handle */
const MIN_FIRST_SEGMENT = 2 * LINE_SPACING;

/**
 * Build a vertical path from source handle to target handle.
 * "right" (default): exits RIGHT then routes to target.
 * "left": exits LEFT then routes to target.
 * "straight": 3-segment V-H-V toward target (no directional preference).
 */
function buildVerticalDirectPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  pathOffset: number,
  firstSegment: number,
  turnDirection: "left" | "right" | "straight",
  lastSegment?: number,
): [string, number, number] {
  // Straight line shortcut when source and target are horizontally aligned
  if (Math.abs(sourceX - targetX) < 1 && lastSegment == null) {
    const path = `M ${sourceX},${sourceY} V ${targetY}`;
    return [path, sourceX, sourceY + LINE_SPACING];
  }

  const midY = Math.max(
    sourceY + Math.max(MIN_FIRST_SEGMENT, firstSegment + LINE_SPACING),
    Math.min(sourceY + BASE_GAP + pathOffset * 2, targetY - BASE_GAP),
  );

  // When lastSegment is set, force a shared approach level so the final
  // vertical drop and preceding horizontal are identical for all edges
  // arriving at the same target.
  if (lastSegment != null) {
    const approachY = targetY - lastSegment;

    // Straight line when horizontally aligned
    if (Math.abs(sourceX - targetX) < 1) {
      const path = `M ${sourceX},${sourceY} V ${targetY}`;
      return [path, sourceX, sourceY + LINE_SPACING];
    }

    // "straight": 3-segment V-H-V with horizontal at approachY
    if (turnDirection === "straight") {
      const hDir = targetX > sourceX ? 1 : -1;
      const r = Math.max(
        0,
        Math.min(
          BORDER_RADIUS,
          Math.abs(approachY - sourceY) / 2,
          Math.abs(targetX - sourceX) / 2,
          lastSegment / 2,
        ),
      );
      const path = [
        `M ${sourceX},${sourceY}`,
        `V ${approachY - r}`,
        `Q ${sourceX},${approachY} ${sourceX + hDir * r},${approachY}`,
        `H ${targetX - hDir * r}`,
        `Q ${targetX},${approachY} ${targetX},${approachY + r}`,
        `V ${targetY}`,
      ].join(" ");
      return [path, sourceX, sourceY + LINE_SPACING];
    }

    // "left"/"right": 5-segment V-H-V-H-V preserving arrow shape
    const turnLeft = turnDirection === "left";
    const hDir = turnLeft ? -1 : 1;
    const jogX = sourceX + hDir * LINE_SPACING;
    const hDirApproach = targetX > jogX ? 1 : -1;

    const r = Math.max(
      0,
      Math.min(
        BORDER_RADIUS,
        Math.abs(midY - sourceY) / 2,
        Math.abs(jogX - sourceX) / 2,
        Math.abs(approachY - midY) / 2,
        Math.abs(targetX - jogX) / 2,
        lastSegment / 2,
      ),
    );

    const path = [
      `M ${sourceX},${sourceY}`,
      `V ${midY - r}`,
      `Q ${sourceX},${midY} ${sourceX + hDir * r},${midY}`,
      `H ${jogX - hDir * r}`,
      `Q ${jogX},${midY} ${jogX},${midY + r}`,
      `V ${approachY - r}`,
      `Q ${jogX},${approachY} ${jogX + hDirApproach * r},${approachY}`,
      `H ${targetX - hDirApproach * r}`,
      `Q ${targetX},${approachY} ${targetX},${approachY + r}`,
      `V ${targetY}`,
    ].join(" ");

    return [path, sourceX, sourceY + LINE_SPACING];
  }

  // --- No lastSegment: original routing ---

  // "straight" always uses 3-segment V-H-V toward target
  if (turnDirection === "straight") {
    const hDir = targetX > sourceX ? 1 : -1;
    const r = Math.max(
      0,
      Math.min(
        BORDER_RADIUS,
        Math.abs(midY - sourceY) / 2,
        Math.abs(targetX - sourceX) / 2,
        Math.abs(targetY - midY) / 2,
      ),
    );
    const path = [
      `M ${sourceX},${sourceY}`,
      `V ${midY - r}`,
      `Q ${sourceX},${midY} ${sourceX + hDir * r},${midY}`,
      `H ${targetX - hDir * r}`,
      `Q ${targetX},${midY} ${targetX},${midY + r}`,
      `V ${targetY}`,
    ].join(" ");
    return [path, sourceX, sourceY + LINE_SPACING];
  }

  const turnLeft = turnDirection === "left";
  const targetOnExitSide = turnLeft ? targetX < sourceX : targetX > sourceX;

  if (targetOnExitSide) {
    // 3-segment: down → horizontal (in exit direction) → down
    const r = Math.max(
      0,
      Math.min(
        BORDER_RADIUS,
        Math.abs(midY - sourceY) / 2,
        Math.abs(targetX - sourceX) / 2,
        Math.abs(targetY - midY) / 2,
      ),
    );

    const hDir = turnLeft ? -1 : 1;
    const path = [
      `M ${sourceX},${sourceY}`,
      `V ${midY - r}`,
      `Q ${sourceX},${midY} ${sourceX + hDir * r},${midY}`,
      `H ${targetX - hDir * r}`,
      `Q ${targetX},${midY} ${targetX},${midY + r}`,
      `V ${targetY}`,
    ].join(" ");

    return [path, sourceX, sourceY + LINE_SPACING];
  }

  // Target is on the OPPOSITE side: 5-segment route via exit direction first
  const offset = firstSegment + LINE_SPACING;
  const exitX = turnLeft ? sourceX - offset : sourceX + offset;
  const approachY = targetY - BASE_GAP;

  const r = Math.max(
    0,
    Math.min(
      BORDER_RADIUS,
      Math.abs(midY - sourceY) / 2,
      Math.abs(exitX - sourceX) / 2,
      Math.abs(approachY - midY) / 2,
      Math.abs(exitX - targetX) / 2,
      Math.abs(targetY - approachY) / 2,
    ),
  );

  const hDir = turnLeft ? -1 : 1;
  const hDirApproach = targetX > exitX ? 1 : -1;

  const path = [
    `M ${sourceX},${sourceY}`,
    `V ${midY - r}`,
    `Q ${sourceX},${midY} ${sourceX + hDir * r},${midY}`,
    `H ${exitX - hDir * r}`,
    `Q ${exitX},${midY} ${exitX},${midY + r}`,
    `V ${approachY - r}`,
    `Q ${exitX},${approachY} ${exitX + hDirApproach * r},${approachY}`,
    `H ${targetX - hDirApproach * r}`,
    `Q ${targetX},${approachY} ${targetX},${approachY + r}`,
    `V ${targetY}`,
  ].join(" ");

  return [path, sourceX, sourceY + LINE_SPACING];
}

/**
 * Build a routed vertical path from source (bottom handle) to target (top handle).
 * Delegates to direct path when target is well below source.
 * For back-edges (target not below source), uses a 5-segment route.
 */
function buildVerticalRoutedPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  pathOffset: number,
  approachOffset: number,
  firstSegment: number,
  turnDirection: "left" | "right" | "straight",
  lastSegment?: number,
  targetNodeLeft?: number,
): [string, number, number] {
  const verticalGap = targetY - sourceY;
  if (verticalGap > 2 * BASE_GAP) {
    return buildVerticalDirectPath(
      sourceX,
      sourceY,
      targetX,
      targetY,
      pathOffset,
      firstSegment,
      turnDirection,
      lastSegment,
    );
  }

  // Back-edge: source → down(hy) → horizontal(hx) → up/down(vy) → horizontal(targetX) → down(target)
  const hy =
    sourceY +
    Math.max(MIN_FIRST_SEGMENT, firstSegment + LINE_SPACING) +
    pathOffset * 2;
  const hx =
    targetNodeLeft != null
      ? targetNodeLeft - BASE_GAP - approachOffset
      : Math.min(sourceX, targetX) - BASE_GAP - approachOffset;
  const vy = targetY - BASE_GAP - approachOffset;

  const r = Math.max(
    0,
    Math.min(
      BORDER_RADIUS,
      Math.abs(hy - sourceY) / 2,
      Math.abs(sourceX - hx) / 2,
      Math.abs(vy - hy) / 2,
      Math.abs(targetX - hx) / 2,
      Math.abs(targetY - vy) / 2,
    ),
  );

  const path = [
    `M ${sourceX},${sourceY}`,
    `V ${hy - r}`,
    `Q ${sourceX},${hy} ${sourceX - r},${hy}`,
    `H ${hx + r}`,
    `Q ${hx},${hy} ${hx},${hy - r < vy ? hy + r : hy - r}`,
    `V ${vy + r}`,
    `Q ${hx},${vy} ${hx + r},${vy}`,
    `H ${targetX - r}`,
    `Q ${targetX},${vy} ${targetX},${vy + r}`,
    `V ${targetY}`,
  ].join(" ");

  const labelX = sourceX;
  const labelY = sourceY + LINE_SPACING;

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
  color: "var(--color-primary, #008080)",
  border: "1.5px solid var(--color-primary, #008080)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  lineHeight: 1,
  boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
};

const btnHighlightedStyle: CSSProperties = {
  ...btnStyle,
  color: "var(--color-accent, #ff7f50)",
  border: "1.5px solid var(--color-accent, #ff7f50)",
};

const menuStyle: CSSProperties = {
  position: "fixed",
  background: "#fff",
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.16)",
  zIndex: 10000,
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
  const firstSegment = edgeData?.firstSegment ?? LINE_SPACING;
  const targetNodeLeft = edgeData?.targetNodeLeft;

  const turnDirection = edgeData?.turnDirection ?? "right";
  const lastSegment = edgeData?.lastSegment;

  const [edgePath, labelX, labelY] = buildVerticalRoutedPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    pathOffset,
    approachOffset,
    firstSegment,
    turnDirection,
    lastSegment,
    targetNodeLeft,
  );
  const readOnly = edgeData?.readOnly ?? true;
  const highlighted = edgeData?.highlighted ?? false;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  // Position the portal menu below the button
  useEffect(() => {
    if (!menuOpen || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2 });
  }, [menuOpen]);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick, true);
    return () => document.removeEventListener("mousedown", handleClick, true);
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
            style={{
              ...btnWrapperStyle,
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <button
              ref={btnRef}
              style={highlighted ? btnHighlightedStyle : btnStyle}
              title="Edit edge"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <PencilIcon />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
      {menuOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              ...menuStyle,
              top: menuPos.top,
              left: menuPos.left,
              transform: "translateX(-50%)",
            }}
          >
            <button
              style={menuItemStyle}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f3f4f6")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              onClick={() => handleAction("multiple-choice")}
            >
              Multiple choice question
            </button>
            <button
              style={menuItemStyle}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f3f4f6")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              onClick={() => handleAction("text")}
            >
              Free text question
            </button>
            <button
              style={menuItemStyle}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f3f4f6")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
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
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              onClick={() => handleAction("delete")}
            >
              Delete
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
