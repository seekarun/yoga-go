"use client";

import {
  memo,
  createContext,
  useContext,
  useRef,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { SurveyQuestion } from "@core/types";
import { LINE_SPACING } from "./constants";

const nodeStyle: CSSProperties = {
  position: "relative",
  border: "1px solid #d1d5db",
  borderColor: "#d1d5db",
  borderRadius: "8px",
  background: "#fff",
  minWidth: 300,
  maxWidth: 380,
  fontSize: "13px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const selectedStyle: CSSProperties = {
  ...nodeStyle,
  borderColor: "var(--color-accent, #ff7f50)",
  boxShadow: "0 0 0 2px var(--color-accent, #ff7f50)",
};

/** Subtle highlight for neighbor nodes — primary border, no outer ring */
const highlightedStyle: CSSProperties = {
  ...nodeStyle,
  borderColor: "var(--color-primary, #008080)",
};

const finishNodeStyle: CSSProperties = {
  ...nodeStyle,
  borderRadius: "4px",
};

const finishSelectedStyle: CSSProperties = {
  ...selectedStyle,
  borderRadius: "4px",
};

const finishHighlightedStyle: CSSProperties = {
  ...highlightedStyle,
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
  padding: "8px 12px 14px",
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
  fontSize: "12px",
  color: "var(--text-muted, #6b7280)",
  padding: "4px 8px",
  background: "#f9fafb",
  borderRadius: "4px",
  border: "1px solid #d1d5db",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  overflow: "hidden",
};

const optionLabelStyle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const handleStyle: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  border: "2px solid var(--color-primary, #008080)",
  background: "#fff",
};

const handleAccentStyle: CSSProperties = {
  ...handleStyle,
  border: "2px solid var(--color-accent, #ff7f50)",
};

const ACCENT_COLOR = "var(--color-accent, #ff7f50)";

/** true when any node is selected — drives option-border accents */
export const FlowSelectionContext = createContext(false);

export interface QuestionNodeData {
  question: SurveyQuestion;
  highlighted?: boolean;
  highlightedHandles?: string[];
  onPathHandles?: string[];
  dimmed?: boolean;
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

/** Connector line color */
const CONNECTOR_COLOR = "#d1d5db";
/** Darker grey for on-path (but not direct-neighbor) connectors/options */
const ON_PATH_COLOR = "#6b7280";

const draggingStyle: CSSProperties = {
  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
  cursor: "grabbing",
};

function QuestionNodeComponent({
  data,
  selected,
  dragging,
}: QuestionNodeProps) {
  const {
    question,
    highlighted,
    highlightedHandles = [],
    onPathHandles = [],
    dimmed,
  } = data;
  const selectionActive = useContext(FlowSelectionContext);
  // Accent handles only when a node selection is active AND this node is relevant
  const hlSet = new Set(
    selectionActive && (selected || highlighted) ? highlightedHandles : [],
  );
  // On-path (but not direct-neighbor) handles — dark grey visual
  const pathSet = new Set(selectionActive ? onPathHandles : []);
  const isMC = question.type === "multiple-choice";
  const isFinish = question.type === "finish";
  const hasOptions =
    isMC || (question.type === "text" && question.inference === "process");
  const badge = getBadge(question.type, question.inference);
  const truncated =
    question.questionText.length > 80
      ? question.questionText.slice(0, 80) + "..."
      : question.questionText;
  const getStyle = (): CSSProperties => {
    let base: CSSProperties;
    if (isFinish) {
      if (selected) base = finishSelectedStyle;
      else if (highlighted) base = finishHighlightedStyle;
      else base = finishNodeStyle;
    } else if (selected) base = selectedStyle;
    else if (highlighted) base = highlightedStyle;
    else base = nodeStyle;
    if (dragging) base = { ...base, ...draggingStyle };
    if (dimmed && !selected) base = { ...base, opacity: 0.2 };
    return base;
  };

  const cardRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Connector lines stored as local-space coords (transform-independent)
  const [connectors, setConnectors] = useState<
    {
      optionRight: number;
      optionCenterY: number;
      handleX: number;
      cardH: number;
    }[]
  >([]);

  const optCount = hasOptions ? (question.options?.length ?? 0) : 0;

  useLayoutEffect(() => {
    if (!hasOptions || optCount === 0 || !cardRef.current) {
      setConnectors([]);
      return;
    }
    const card = cardRef.current;
    const cardW = card.offsetWidth;
    const cardH = card.offsetHeight;
    const lines: typeof connectors = [];

    for (let i = 0; i < optCount; i++) {
      const el = optionRefs.current[i];
      if (!el) continue;
      // offset* values are relative to card (nearest positioned ancestor)
      const optionRight = el.offsetLeft + el.offsetWidth;
      const optionCenterY = el.offsetTop + el.offsetHeight / 2;
      // Option 0 → rightmost lane, option N-1 → leftmost lane (no crossing)
      const handleX = cardW - (i + 1) * LINE_SPACING;
      lines.push({ optionRight, optionCenterY, handleX, cardH });
    }

    setConnectors(lines);
    // Re-measure when card dimensions or option count change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOptions, optCount, question.questionText]);

  return (
    <div ref={cardRef} style={getStyle()}>
      {/* Target handle (top-left) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          ...(hlSet.has("target") ? handleAccentStyle : handleStyle),
          left: LINE_SPACING,
        }}
        id="target"
      />

      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontSize: "11px", color: "var(--text-muted, #6b7280)" }}>
          {isFinish ? "End" : `Q${question.order}`}
        </span>
        <span style={badge.style}>{badge.label}</span>
      </div>

      {/* Body — extra right padding when options need connector lanes */}
      <div
        style={
          optCount > 0
            ? { ...bodyStyle, paddingRight: (optCount + 1) * LINE_SPACING }
            : bodyStyle
        }
      >
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
            {question.options.map((opt, i) => {
              const hId = `option-${opt.id}`;
              const optHl = hlSet.has(hId);
              const optOnPath = !optHl && pathSet.has(hId);
              const borderColor = optHl
                ? ACCENT_COLOR
                : optOnPath
                  ? ON_PATH_COLOR
                  : "#d1d5db";
              return (
                <div
                  key={opt.id}
                  ref={(el) => {
                    optionRefs.current[i] = el;
                  }}
                  style={{ ...optionItemStyle, borderColor }}
                >
                  <span style={optionLabelStyle}>{opt.label || "Option"}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SVG connector lines from options to handles */}
      {connectors.length > 0 && cardRef.current && (
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          {connectors.map((c, i) => {
            const optId = question.options?.[i]?.id;
            const hId = optId ? `option-${optId}` : "";
            const lineHl = hlSet.has(hId);
            const lineOnPath = !lineHl && pathSet.has(hId);
            const lineColor = lineHl
              ? ACCENT_COLOR
              : lineOnPath
                ? ON_PATH_COLOR
                : CONNECTOR_COLOR;
            return (
              <path
                key={i}
                d={`M ${c.optionRight} ${c.optionCenterY} H ${c.handleX} V ${c.cardH}`}
                fill="none"
                stroke={lineColor}
                strokeWidth={1.5}
              />
            );
          })}
        </svg>
      )}

      {/* Per-option source handles at bottom-right (option 0 = rightmost) */}
      {hasOptions &&
        question.options &&
        question.options.length > 0 &&
        question.options.map((opt, i) => {
          const hId = `option-${opt.id}`;
          return (
            <Handle
              key={opt.id}
              type="source"
              position={Position.Bottom}
              id={hId}
              style={{
                ...(hlSet.has(hId) ? handleAccentStyle : handleStyle),
                position: "absolute",
                right: (i + 1) * LINE_SPACING,
                left: "auto",
                bottom: -6,
                transform: "translateX(50%)",
              }}
            />
          );
        })}

      {/* "Any" handle — capsule at bottom center, acts as the source handle */}
      {hasOptions && optCount >= 2 && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="any"
          style={{
            position: "absolute",
            bottom: -14,
            left: "50%",
            transform: "translateX(-50%)",
            width: "auto",
            height: "auto",
            padding: "1px 8px",
            borderRadius: "8px",
            border: hlSet.has("any")
              ? "2px solid var(--color-accent, #ff7f50)"
              : "2px solid var(--color-primary, #008080)",
            background: "#fff",
            fontSize: "10px",
            fontWeight: 700,
            color: hlSet.has("any")
              ? "var(--color-accent, #ff7f50)"
              : "var(--color-primary, #008080)",
            lineHeight: "14px",
            cursor: "crosshair",
          }}
        >
          Any
        </Handle>
      )}

      {/* Source handle (bottom-right) — only when no per-option handles and not finish */}
      {!hasOptions && !isFinish && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            ...(hlSet.has("default") ? handleAccentStyle : handleStyle),
            right: LINE_SPACING,
            left: "auto",
            transform: "translateX(50%)",
          }}
          id="default"
        />
      )}
    </div>
  );
}

export const QuestionNode = memo(QuestionNodeComponent);
