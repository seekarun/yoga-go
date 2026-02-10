"use client";

import { useState, useCallback, type CSSProperties } from "react";
import type { SurveyQuestion, QuestionType, QuestionOption } from "@core/types";

interface QuestionEditorPanelProps {
  question: SurveyQuestion;
  onChange: (updated: SurveyQuestion) => void;
  onDelete: (questionId: string) => void;
  onClose: () => void;
  canDelete?: boolean;
}

const panelStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  right: 0,
  width: 340,
  height: "100%",
  background: "#fff",
  borderLeft: "1px solid var(--color-border, #e5e7eb)",
  boxShadow: "-4px 0 12px rgba(0,0,0,0.06)",
  zIndex: 10,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const headerBarStyle: CSSProperties = {
  padding: "16px",
  borderBottom: "1px solid var(--color-border, #e5e7eb)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const scrollBodyStyle: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--text-main, #1f2937)",
  marginBottom: "4px",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: "6px",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  appearance: "auto",
};

const btnPrimary: CSSProperties = {
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: 600,
  background: "var(--color-primary, #6366f1)",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const btnDanger: CSSProperties = {
  ...btnPrimary,
  background: "#ef4444",
};

const btnGhost: CSSProperties = {
  padding: "6px 12px",
  fontSize: "12px",
  background: "transparent",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: "6px",
  cursor: "pointer",
  color: "var(--text-muted, #6b7280)",
};

const optionRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

function generateOptionId(): string {
  return Math.random().toString(36).substring(2, 8);
}

export function QuestionEditorPanel({
  question,
  onChange,
  onDelete,
  onClose,
  canDelete = true,
}: QuestionEditorPanelProps) {
  const [text, setText] = useState(question.questionText);
  const [type, setType] = useState<QuestionType>(question.type);
  const [required, setRequired] = useState(question.required);
  const [options, setOptions] = useState<QuestionOption[]>(
    question.options ?? [],
  );
  const [inference, setInference] = useState<"none" | "process">(
    question.inference ?? "none",
  );

  const commitChanges = useCallback(
    (overrides?: Partial<SurveyQuestion>) => {
      const effectiveType = overrides?.type ?? type;
      const effectiveInference = overrides?.inference ?? inference;
      const keepOptions =
        effectiveType === "multiple-choice" ||
        (effectiveType === "text" && effectiveInference === "process");
      const updated: SurveyQuestion = {
        ...question,
        questionText: text,
        type,
        inference: effectiveType === "text" ? effectiveInference : undefined,
        required: effectiveType === "finish" ? false : required,
        options: keepOptions ? options : undefined,
        branches: effectiveType === "finish" ? [] : question.branches,
        ...overrides,
      };
      onChange(updated);
    },
    [question, text, type, required, options, inference, onChange],
  );

  const handleTextChange = (val: string) => {
    setText(val);
    commitChanges({ questionText: val });
  };

  const handleTypeChange = (val: QuestionType) => {
    setType(val);
    // Reset inference when switching away from text
    if (val !== "text") {
      setInference("none");
    }
    const newOpts =
      val === "multiple-choice" && options.length === 0
        ? [
            { id: generateOptionId(), label: "Option 1" },
            { id: generateOptionId(), label: "Option 2" },
          ]
        : options;
    setOptions(newOpts);

    // When switching to text (no inference), consolidate option branches
    // into a single default branch so the edge stays connected
    let newBranches: typeof question.branches;
    if (val === "text") {
      const firstTarget = (question.branches ?? []).find(
        (b) => b.nextQuestionId,
      )?.nextQuestionId;
      newBranches = firstTarget ? [{ nextQuestionId: firstTarget }] : [];
    }

    commitChanges({
      type: val,
      inference: val === "text" ? "none" : undefined,
      options: val === "multiple-choice" ? newOpts : undefined,
      ...(newBranches !== undefined ? { branches: newBranches } : {}),
    });
  };

  const handleInferenceChange = (val: "none" | "process") => {
    setInference(val);
    if (val === "process") {
      const newOpts =
        options.length === 0
          ? [
              { id: generateOptionId(), label: "Option 1" },
              { id: generateOptionId(), label: "Option 2" },
            ]
          : options;
      setOptions(newOpts);
      commitChanges({ inference: val, options: newOpts });
    } else {
      setOptions([]);
      // Remove option-based branches when disabling inference
      const updatedBranches = (question.branches ?? []).filter(
        (b) => !b.optionId,
      );
      commitChanges({
        inference: val,
        options: undefined,
        branches: updatedBranches,
      });
    }
  };

  const handleRequiredChange = (val: boolean) => {
    setRequired(val);
    commitChanges({ required: val });
  };

  const handleOptionLabelChange = (optionId: string, label: string) => {
    const updated = options.map((o) =>
      o.id === optionId ? { ...o, label } : o,
    );
    setOptions(updated);
    commitChanges({ options: updated });
  };

  const addOption = () => {
    const newOpt = {
      id: generateOptionId(),
      label: `Option ${options.length + 1}`,
    };
    const updated = [...options, newOpt];
    setOptions(updated);

    // Auto-create a branch for the new option pointing to the same target
    // as an existing option branch so the edge is drawn immediately
    const existingBranch = (question.branches ?? []).find(
      (b) => b.optionId && b.nextQuestionId,
    );
    const newBranches = existingBranch
      ? [
          ...(question.branches ?? []),
          {
            optionId: newOpt.id,
            nextQuestionId: existingBranch.nextQuestionId,
          },
        ]
      : undefined;

    commitChanges({
      options: updated,
      ...(newBranches ? { branches: newBranches } : {}),
    });
  };

  const removeOption = (optionId: string) => {
    if (options.length <= 2) return; // MC needs at least 2
    const updated = options.filter((o) => o.id !== optionId);
    setOptions(updated);
    // Also remove branches referencing this option
    const updatedBranches = (question.branches ?? []).filter(
      (b) => b.optionId !== optionId,
    );
    commitChanges({ options: updated, branches: updatedBranches });
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerBarStyle}>
        <span
          style={{
            fontWeight: 600,
            fontSize: "14px",
            color: "var(--text-main, #1f2937)",
          }}
        >
          Edit Question
        </span>
        <button onClick={onClose} style={btnGhost} title="Close">
          &times;
        </button>
      </div>

      {/* Body */}
      <div style={scrollBodyStyle}>
        {/* Question text / Finish message */}
        <div>
          <label style={labelStyle}>
            {type === "finish" ? "Finish Message" : "Question Text"}
          </label>
          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
            placeholder={
              type === "finish"
                ? "Thank you for your time"
                : "Enter your question..."
            }
          />
        </div>

        {/* Type */}
        <div>
          <label style={labelStyle}>Type</label>
          <select
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            style={selectStyle}
          >
            <option value="text">Text</option>
            <option value="multiple-choice">Multiple Choice</option>
            <option value="finish">Finish</option>
          </select>
        </div>

        {/* AI Inference dropdown — only for text questions */}
        {type === "text" && (
          <div>
            <label style={labelStyle}>AI Inference</label>
            <select
              value={inference}
              onChange={(e) =>
                handleInferenceChange(e.target.value as "none" | "process")
              }
              style={selectStyle}
            >
              <option value="none">Do not process</option>
              <option value="process">Process</option>
            </select>
          </div>
        )}

        {/* Required toggle — not applicable to finish */}
        {type !== "finish" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              id="q-required"
              checked={required}
              onChange={(e) => handleRequiredChange(e.target.checked)}
            />
            <label
              htmlFor="q-required"
              style={{ fontSize: "13px", color: "var(--text-main, #1f2937)" }}
            >
              Required
            </label>
          </div>
        )}

        {/* Options editor — MC or text with inference */}
        {(type === "multiple-choice" ||
          (type === "text" && inference === "process")) && (
          <div>
            <label style={labelStyle}>
              {type === "text" ? "Inference Options" : "Options"}
            </label>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              {options.map((opt) => (
                <div key={opt.id} style={optionRowStyle}>
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) =>
                      handleOptionLabelChange(opt.id, e.target.value)
                    }
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="Option label"
                  />
                  <button
                    onClick={() => removeOption(opt.id)}
                    style={{
                      ...btnGhost,
                      padding: "6px 8px",
                      opacity: options.length <= 2 ? 0.3 : 1,
                    }}
                    disabled={options.length <= 2}
                    title="Remove option"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button onClick={addOption} style={btnGhost}>
                + Add Option
              </button>
            </div>
          </div>
        )}

        {/* Delete */}
        <div style={{ marginTop: "auto", paddingTop: "16px" }}>
          <button
            onClick={() => onDelete(question.id)}
            disabled={!canDelete}
            style={{
              ...btnDanger,
              width: "100%",
              opacity: canDelete ? 1 : 0.4,
              cursor: canDelete ? "pointer" : "not-allowed",
            }}
            title={canDelete ? undefined : "Cannot delete the only finish node"}
          >
            Delete Question
          </button>
        </div>
      </div>
    </div>
  );
}
