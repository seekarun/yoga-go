"use client";

import { type CSSProperties } from "react";
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";

export interface AddButtonEdgeData {
  onInsert: (
    edgeId: string,
    source: string,
    target: string,
    sourceHandle: string | null,
  ) => void;
  readOnly: boolean;
  pathOffset?: number;
  approachOffset?: number;
  targetNodeTop?: number;
  targetNodeRight?: number;
  maxPathOffset?: number;
  [key: string]: unknown;
}

const BASE_GAP = 20;
const BORDER_RADIUS = 8;

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
): [string, number, number] {
  // Right-side vertical X — anchored to target node's right edge when available
  const vx =
    targetNodeRight != null && maxPathOffset != null
      ? Math.max(
          sourceX + BASE_GAP,
          targetNodeRight - (maxPathOffset - pathOffset),
        )
      : Math.max(sourceX, targetX) + BASE_GAP + pathOffset;
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

  // Place label at midpoint of horizontal approach segment
  const labelX = (vx + lx) / 2;
  const labelY = hy;

  return [path, labelX, labelY];
}

const btnWrapperStyle: CSSProperties = {
  position: "absolute",
  pointerEvents: "all",
};

const btnStyle: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  background: "var(--color-primary, #6366f1)",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  fontWeight: 700,
  lineHeight: 1,
  boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
};

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
  );
  const readOnly = edgeData?.readOnly ?? true;

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
              style={btnStyle}
              title="Insert question"
              onClick={() =>
                edgeData?.onInsert(id, source, target, sourceHandleId ?? null)
              }
            >
              +
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
