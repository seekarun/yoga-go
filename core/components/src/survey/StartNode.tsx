"use client";

import { memo, type CSSProperties } from "react";
import { Handle, Position } from "@xyflow/react";

const nodeStyle: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: "50%",
  background: "var(--color-primary, #6366f1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontWeight: 700,
  fontSize: "13px",
  boxShadow: "0 2px 6px rgba(99,102,241,0.35)",
};

const handleStyle: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  border: "2px solid var(--color-primary, #6366f1)",
  background: "#fff",
};

function StartNodeComponent() {
  return (
    <div style={nodeStyle}>
      Start
      <Handle
        type="source"
        position={Position.Right}
        id="default"
        style={handleStyle}
      />
    </div>
  );
}

export const StartNode = memo(StartNodeComponent);
