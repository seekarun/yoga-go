"use client";

import { memo, type CSSProperties } from "react";
import { Handle, Position } from "@xyflow/react";

const nodeStyle: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: "50%",
  background: "var(--color-primary, #008080)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontWeight: 700,
  fontSize: "13px",
  boxShadow: "0 2px 6px rgba(0,128,128,0.35)",
};

const handleStyle: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  border: "2px solid var(--color-primary, #008080)",
  background: "#fff",
};

function StartNodeComponent() {
  return (
    <div style={nodeStyle}>
      Start
      <Handle
        type="source"
        position={Position.Bottom}
        id="default"
        style={handleStyle}
      />
    </div>
  );
}

export const StartNode = memo(StartNodeComponent);
