"use client";

import { memo, type CSSProperties } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { SurveyQuestion } from "@core/types";

const nodeStyle: CSSProperties = {
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: "8px",
  background: "#fff",
  minWidth: 220,
  maxWidth: 280,
  fontSize: "13px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const selectedStyle: CSSProperties = {
  ...nodeStyle,
  borderColor: "var(--color-primary, #6366f1)",
  boxShadow: "0 0 0 2px var(--color-primary, #6366f1)",
};

const finishNodeStyle: CSSProperties = {
  ...nodeStyle,
  borderRadius: "4px",
};

const finishSelectedStyle: CSSProperties = {
  ...selectedStyle,
  borderRadius: "4px",
};

const headerStyle: CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid var(--color-border, #e5e7eb)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "6px",
};

const badgeStyle: CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  padding: "2px 6px",
  borderRadius: "4px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const mcBadge: CSSProperties = {
  ...badgeStyle,
  background: "#ede9fe",
  color: "#7c3aed",
};

const textBadge: CSSProperties = {
  ...badgeStyle,
  background: "#e0f2fe",
  color: "#0284c7",
};

const finishBadge: CSSProperties = {
  ...badgeStyle,
  background: "#dcfce7",
  color: "#16a34a",
};

const inferenceBadge: CSSProperties = {
  ...badgeStyle,
  background: "#fef3c7",
  color: "#d97706",
};

const bodyStyle: CSSProperties = {
  padding: "8px 12px",
};

const questionTextStyle: CSSProperties = {
  fontWeight: 500,
  color: "var(--text-main, #1f2937)",
  lineHeight: 1.4,
  wordBreak: "break-word",
};

const optionListStyle: CSSProperties = {
  marginTop: "8px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const optionItemStyle: CSSProperties = {
  position: "relative",
  fontSize: "12px",
  color: "var(--text-muted, #6b7280)",
  padding: "4px 8px",
  background: "#f9fafb",
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const handleStyle: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  border: "2px solid var(--color-primary, #6366f1)",
  background: "#fff",
};

export interface QuestionNodeData {
  question: SurveyQuestion;
  [key: string]: unknown;
}

type QuestionNodeProps = NodeProps & { data: QuestionNodeData };

function getBadge(
  type: string,
  inference?: string,
): { style: CSSProperties; label: string } {
  if (type === "text" && inference === "process") {
    return { style: inferenceBadge, label: "AI" };
  }
  switch (type) {
    case "multiple-choice":
      return { style: mcBadge, label: "MC" };
    case "finish":
      return { style: finishBadge, label: "Finish" };
    default:
      return { style: textBadge, label: "Text" };
  }
}

function QuestionNodeComponent({ data, selected }: QuestionNodeProps) {
  const { question } = data;
  const isMC = question.type === "multiple-choice";
  const isFinish = question.type === "finish";
  const hasOptions =
    isMC || (question.type === "text" && question.inference === "process");
  const badge = getBadge(question.type, question.inference);
  const truncated =
    question.questionText.length > 80
      ? question.questionText.slice(0, 80) + "..."
      : question.questionText;

  return (
    <div
      style={
        isFinish
          ? selected
            ? finishSelectedStyle
            : finishNodeStyle
          : selected
            ? selectedStyle
            : nodeStyle
      }
    >
      {/* Target handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        style={handleStyle}
        id="target"
      />

      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontSize: "11px", color: "var(--text-muted, #6b7280)" }}>
          {isFinish ? "End" : `Q${question.order}`}
        </span>
        <span style={badge.style}>{badge.label}</span>
      </div>

      {/* Body */}
      <div style={bodyStyle}>
        <div style={questionTextStyle}>
          {truncated ||
            (isFinish ? "Thank you for your time" : "Untitled question")}
        </div>

        {hasOptions && question.options && question.options.length > 0 && (
          <div style={optionListStyle}>
            {question.type === "text" && (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "#d97706",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Inference:
              </span>
            )}
            {question.options.map((opt) => (
              <div key={opt.id} style={optionItemStyle}>
                <span>{opt.label || "Option"}</span>
                {/* Source handle per option */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`option-${opt.id}`}
                  style={{
                    ...handleStyle,
                    position: "absolute",
                    right: -6,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Source handle (right) — only when no per-option handles and not finish */}
      {!hasOptions && !isFinish && (
        <Handle
          type="source"
          position={Position.Right}
          style={handleStyle}
          id="default"
        />
      )}
    </div>
  );
}

export const QuestionNode = memo(QuestionNodeComponent);
