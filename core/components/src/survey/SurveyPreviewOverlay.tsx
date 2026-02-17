"use client";

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  type CSSProperties,
} from "react";
import type { SurveyQuestion, SurveyAnswer } from "@core/types";
import { buildQuestionPath } from "@core/lib/survey-flow";

export interface SurveyPreviewOverlayProps {
  questions: SurveyQuestion[];
  onClose: () => void;
}

/* ─── Styles ─── */

const backdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const cardStyle: CSSProperties = {
  background: "#fff",
  borderRadius: "12px",
  width: "100%",
  maxWidth: 520,
  maxHeight: "90vh",
  overflow: "auto",
  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
  display: "flex",
  flexDirection: "column",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  borderBottom: "1px solid var(--color-border, #e5e7eb)",
};

const headerTitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--text-main, #111)",
};

const closeBtnStyle: CSSProperties = {
  background: "none",
  border: "none",
  fontSize: "20px",
  cursor: "pointer",
  color: "var(--text-muted, #6b7280)",
  lineHeight: 1,
  padding: "4px",
};

const bodyStyle: CSSProperties = {
  padding: "24px 20px",
  flex: 1,
};

const questionTextStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "var(--text-main, #111)",
  marginBottom: "20px",
  lineHeight: 1.4,
};

const optionCardStyle: CSSProperties = {
  padding: "12px 16px",
  border: "2px solid var(--color-border, #e5e7eb)",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "14px",
  color: "var(--text-main, #111)",
  marginBottom: "8px",
  transition: "border-color 0.15s, background 0.15s",
};

const optionCardSelectedStyle: CSSProperties = {
  ...optionCardStyle,
  borderColor: "var(--color-primary, #008080)",
  background: "rgba(0,128,128,0.06)",
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 100,
  padding: "12px",
  border: "2px solid var(--color-border, #e5e7eb)",
  borderRadius: "8px",
  fontSize: "14px",
  resize: "vertical",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const footerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  borderTop: "1px solid var(--color-border, #e5e7eb)",
};

const primaryBtnStyle: CSSProperties = {
  padding: "8px 20px",
  fontSize: "13px",
  fontWeight: 600,
  background: "var(--color-primary, #008080)",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const secondaryBtnStyle: CSSProperties = {
  padding: "8px 20px",
  fontSize: "13px",
  fontWeight: 600,
  background: "#fff",
  color: "var(--text-muted, #6b7280)",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: "6px",
  cursor: "pointer",
};

const disabledBtnStyle: CSSProperties = {
  ...primaryBtnStyle,
  opacity: 0.5,
  cursor: "not-allowed",
};

const completeCardStyle: CSSProperties = {
  textAlign: "center" as const,
  padding: "32px 0",
};

const completeIconStyle: CSSProperties = {
  fontSize: "48px",
  marginBottom: "16px",
};

const completeTitleStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  color: "var(--text-main, #111)",
  marginBottom: "8px",
};

const completeSubStyle: CSSProperties = {
  fontSize: "14px",
  color: "var(--text-muted, #6b7280)",
  marginBottom: "24px",
};

const summaryStyle: CSSProperties = {
  textAlign: "left" as const,
  marginTop: "16px",
};

const summaryItemStyle: CSSProperties = {
  padding: "10px 0",
  borderBottom: "1px solid var(--color-border, #e5e7eb)",
};

const summaryLabelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--text-muted, #6b7280)",
  marginBottom: "4px",
};

const summaryValueStyle: CSSProperties = {
  fontSize: "14px",
  color: "var(--text-main, #111)",
};

/* ─── Component ─── */

export function SurveyPreviewOverlay({
  questions,
  onClose,
}: SurveyPreviewOverlayProps) {
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);
  const [currentInput, setCurrentInput] = useState("");

  const { visited, next } = useMemo(
    () => buildQuestionPath(questions, answers),
    [questions, answers],
  );

  // Auto-skip AI processing nodes (text questions with inference === "process")
  useEffect(() => {
    if (next && next.type === "text" && next.inference === "process") {
      setAnswers((prev) => [...prev, { questionId: next.id, answer: "" }]);
    }
  }, [next]);

  // Reset current input when the active question changes
  useEffect(() => {
    if (!next) return;
    // If going back, restore previous answer
    const existing = answers.find((a) => a.questionId === next.id);
    setCurrentInput(existing?.answer ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when the active question changes
  }, [next?.id]);

  const isComplete = !next;
  const isMC = next?.type === "multiple-choice";
  const isText = next?.type === "text";
  const isFinish = next?.type === "finish";

  const canAdvance = isMC
    ? currentInput !== ""
    : isText
      ? !next.required || currentInput.trim() !== ""
      : true;

  const handleNext = useCallback(() => {
    if (!next || !canAdvance) return;
    if (isFinish) {
      // Mark finish as answered to complete survey
      setAnswers((prev) => [...prev, { questionId: next.id, answer: "" }]);
      return;
    }
    setAnswers((prev) => [
      ...prev,
      { questionId: next.id, answer: currentInput },
    ]);
    setCurrentInput("");
  }, [next, currentInput, canAdvance, isFinish]);

  const handleBack = useCallback(() => {
    if (answers.length === 0) return;
    // Pop last answer — but skip over auto-advanced AI nodes
    let newAnswers = [...answers];
    while (newAnswers.length > 0) {
      const lastAnswer = newAnswers[newAnswers.length - 1];
      const lastQ = questions.find((q) => q.id === lastAnswer.questionId);
      newAnswers = newAnswers.slice(0, -1);
      // Stop if it's a real question (not auto-skipped AI node)
      if (lastQ && !(lastQ.type === "text" && lastQ.inference === "process")) {
        break;
      }
    }
    setAnswers(newAnswers);
  }, [answers, questions]);

  const handleRestart = useCallback(() => {
    setAnswers([]);
    setCurrentInput("");
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Build answer summary for completion screen
  const answerSummary = useMemo(() => {
    const qMap = new Map(questions.map((q) => [q.id, q]));
    return answers
      .filter((a) => {
        const q = qMap.get(a.questionId);
        // Skip AI processing nodes and finish nodes from summary
        if (!q) return false;
        if (q.type === "finish") return false;
        if (q.type === "text" && q.inference === "process") return false;
        return true;
      })
      .map((a) => {
        const q = qMap.get(a.questionId)!;
        let displayAnswer = a.answer;
        if (q.type === "multiple-choice" && q.options) {
          const opt = q.options.find((o) => o.id === a.answer);
          if (opt) displayAnswer = opt.label;
        }
        return { question: q.questionText, answer: displayAnswer };
      });
  }, [answers, questions]);

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <span style={headerTitleStyle}>
            {isComplete ? "Preview Complete" : `Question ${visited.length + 1}`}
          </span>
          <button style={closeBtnStyle} onClick={onClose} title="Close preview">
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          {isComplete ? (
            <div style={completeCardStyle}>
              <div style={completeIconStyle}>&#10003;</div>
              <div style={completeTitleStyle}>Survey Complete</div>
              <div style={completeSubStyle}>
                This is how respondents will see the end of your survey.
              </div>
              {answerSummary.length > 0 && (
                <div style={summaryStyle}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--text-muted, #6b7280)",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Answer Summary
                  </div>
                  {answerSummary.map((item, i) => (
                    <div key={i} style={summaryItemStyle}>
                      <div style={summaryLabelStyle}>{item.question}</div>
                      <div style={summaryValueStyle}>
                        {item.answer || "(empty)"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : isFinish ? (
            <div style={completeCardStyle}>
              <div style={completeIconStyle}>&#10003;</div>
              <div style={completeTitleStyle}>
                {next.questionText || "Thank you!"}
              </div>
              <div style={completeSubStyle}>
                This is the finish screen respondents will see.
              </div>
            </div>
          ) : (
            <>
              <div style={questionTextStyle}>
                {next.questionText || "(No question text)"}
              </div>

              {isMC &&
                next.options?.map((opt) => (
                  <div
                    key={opt.id}
                    style={
                      currentInput === opt.id
                        ? optionCardSelectedStyle
                        : optionCardStyle
                    }
                    onClick={() => setCurrentInput(opt.id)}
                  >
                    {opt.label}
                  </div>
                ))}

              {isText && (
                <textarea
                  style={textareaStyle}
                  placeholder="Type your answer..."
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <div>
            {!isComplete && answers.length > 0 && (
              <button style={secondaryBtnStyle} onClick={handleBack}>
                &#8592; Back
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {isComplete && (
              <button style={secondaryBtnStyle} onClick={handleRestart}>
                Restart
              </button>
            )}
            {isComplete ? (
              <button style={primaryBtnStyle} onClick={onClose}>
                Close
              </button>
            ) : (
              <button
                style={canAdvance ? primaryBtnStyle : disabledBtnStyle}
                onClick={handleNext}
                disabled={!canAdvance}
              >
                {isFinish ? "Finish" : "Next"} &#8594;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
