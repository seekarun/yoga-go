"use client";

import { type CSSProperties } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

export interface AddButtonEdgeData {
  onInsert: (
    edgeId: string,
    source: string,
    target: string,
    sourceHandle: string | null,
  ) => void;
  readOnly: boolean;
  [key: string]: unknown;
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
  sourcePosition,
  targetPosition,
  sourceHandleId,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as AddButtonEdgeData | undefined;
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
