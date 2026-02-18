"use client";

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import type { SurveyQuestion, SurveyAnswer } from "@core/types";
import { buildQuestionPath } from "@core/lib/survey-flow";

export interface SurveyPreviewOverlayProps {
  questions: SurveyQuestion[];
  onClose: () => void;
  onInfer?: (
    question: string,
    answer: string,
    options: { id: string; label: string }[],
  ) => Promise<string | null>;
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
  outline: "none",
};

const optionCardFocusedStyle: CSSProperties = {
  ...optionCardStyle,
  boxShadow: "0 0 0 2px var(--color-primary, #008080)",
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
  gap: "8px",
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
  onInfer,
}: SurveyPreviewOverlayProps) {
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [focusedOptIdx, setFocusedOptIdx] = useState(-1);
  const [inferring, setInferring] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  // Persists entered values across back-navigation so they can be restored
  const savedInputsRef = useRef<Map<string, string>>(new Map());

  const { visited, next } = useMemo(
    () => buildQuestionPath(questions, answers),
    [questions, answers],
  );

  // Auto-skip AI processing nodes only when onInfer is NOT provided (backward compat)
  useEffect(() => {
    if (
      !onInfer &&
      next &&
      next.type === "text" &&
      next.inference === "process"
    ) {
      setAnswers((prev) => [...prev, { questionId: next.id, answer: "" }]);
    }
  }, [next, onInfer]);

  // Note: classifier nodes are shown as selectable options in preview
  // so the user can test each branch manually (no real visitor data available).

  // Reset current input when the active question changes, restoring saved value if any
  useEffect(() => {
    if (!next) return;
    setCurrentInput(savedInputsRef.current.get(next.id) ?? "");
    setFocusedOptIdx(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when the active question changes
  }, [next?.id]);

  // Auto-focus the first interactive element when question changes
  useEffect(() => {
    if (!cardRef.current) return;
    // Small delay to let the DOM render the new question's elements
    const timer = setTimeout(() => {
      if (!cardRef.current) return;
      const firstFocusable = cardRef.current.querySelector<HTMLElement>(
        '[role="option"], textarea, button[data-action="next"]',
      );
      firstFocusable?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [next?.id]);

  // Trap focus inside the overlay card
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = card.querySelectorAll<HTMLElement>(
        'button, [tabindex="0"], textarea, input',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [next?.id]);

  const isComplete = !next;
  const isMC = next?.type === "multiple-choice";
  const isClassifier = next?.type === "classifier";
  const isText = next?.type === "text";
  const isFinish = next?.type === "finish";

  // Find the finish node message for the thanks screen
  const finishMessage = useMemo(() => {
    if (!isComplete) return "";
    const lastAnswer = answers[answers.length - 1];
    if (!lastAnswer) return "Thank you!";
    const finishQ = questions.find((q) => q.id === lastAnswer.questionId);
    return finishQ?.type === "finish"
      ? finishQ.questionText || "Thank you!"
      : "Thank you!";
  }, [isComplete, answers, questions]);

  const isInferenceQuestion =
    isText && next?.inference === "process" && !!onInfer;

  const canAdvance =
    isMC || isClassifier
      ? currentInput !== ""
      : isText
        ? isInferenceQuestion
          ? currentInput.trim() !== "" // inference questions always require input
          : !next.required || currentInput.trim() !== ""
        : true;

  const handleNext = useCallback(async () => {
    if (!next || !canAdvance) return;
    if (isFinish) {
      setAnswers((prev) => [...prev, { questionId: next.id, answer: "" }]);
      return;
    }

    // AI inference: classify the text answer against options, then store the matched optionId
    if (isInferenceQuestion && next.options && next.options.length > 0) {
      setInferring(true);
      try {
        const optionId = await onInfer!(
          next.questionText,
          currentInput,
          next.options,
        );
        savedInputsRef.current.set(next.id, currentInput);
        // Store the optionId as the answer so branching works via getNextQuestionId
        setAnswers((prev) => [
          ...prev,
          { questionId: next.id, answer: optionId ?? "" },
        ]);
        setCurrentInput("");
      } catch (err) {
        console.error("[DBG][SurveyPreviewOverlay] Inference failed:", err);
        // Fall through to default branch on error
        savedInputsRef.current.set(next.id, currentInput);
        setAnswers((prev) => [...prev, { questionId: next.id, answer: "" }]);
        setCurrentInput("");
      } finally {
        setInferring(false);
      }
      return;
    }

    savedInputsRef.current.set(next.id, currentInput);
    setAnswers((prev) => [
      ...prev,
      { questionId: next.id, answer: currentInput },
    ]);
    setCurrentInput("");
  }, [next, currentInput, canAdvance, isFinish, isInferenceQuestion, onInfer]);

  const handleBack = useCallback(() => {
    if (answers.length === 0) return;
    // Pop last answer — but skip over auto-advanced AI nodes
    let newAnswers = [...answers];
    while (newAnswers.length > 0) {
      const lastAnswer = newAnswers[newAnswers.length - 1];
      const lastQ = questions.find((q) => q.id === lastAnswer.questionId);
      newAnswers = newAnswers.slice(0, -1);
      // Stop if it's a real question (not auto-skipped AI node)
      // When onInfer is provided, inference nodes are real questions too
      // Classifiers are now user-selectable in preview, so don't skip them
      const isAutoSkippedAI =
        !onInfer && lastQ?.type === "text" && lastQ?.inference === "process";
      if (lastQ && !isAutoSkippedAI) {
        break;
      }
    }
    setAnswers(newAnswers);
  }, [answers, questions, onInfer]);

  const handleRestart = useCallback(() => {
    setAnswers([]);
    setCurrentInput("");
    savedInputsRef.current.clear();
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
        // Skip finish and classifier nodes from summary
        if (!q) return false;
        if (q.type === "finish") return false;
        if (q.type === "classifier") return false;
        // Skip auto-skipped AI nodes (only when onInfer not provided)
        if (!onInfer && q.type === "text" && q.inference === "process")
          return false;
        return true;
      })
      .map((a) => {
        const q = qMap.get(a.questionId)!;
        let displayAnswer = a.answer;
        if (q.type === "multiple-choice" && q.options) {
          const opt = q.options.find((o) => o.id === a.answer);
          if (opt) displayAnswer = opt.label;
        }
        // For inference questions, show the saved user text, not the optionId
        if (onInfer && q.type === "text" && q.inference === "process") {
          displayAnswer = savedInputsRef.current.get(q.id) ?? a.answer;
        }
        return { question: q.questionText, answer: displayAnswer };
      });
  }, [answers, questions, onInfer]);

  return (
    <div style={backdropStyle} onClick={onClose}>
      {/* Spinner keyframes for inference loading */}
      {inferring && (
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      )}
      <div ref={cardRef} style={cardStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <span style={headerTitleStyle}>
            {isComplete
              ? "Preview Complete"
              : isFinish
                ? "Review"
                : `Question ${visited.length + 1}`}
          </span>
          <button style={closeBtnStyle} onClick={onClose} title="Close preview">
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          {isComplete ? (
            /* Thanks screen */
            <div style={completeCardStyle}>
              <div style={completeIconStyle}>&#10003;</div>
              <div style={completeTitleStyle}>{finishMessage}</div>
              <div style={completeSubStyle}>
                This is the finish screen respondents will see.
              </div>
            </div>
          ) : isFinish ? (
            /* Summary screen — shown before submitting */
            <div>
              <div style={completeTitleStyle}>Review Your Answers</div>
              <div style={{ ...completeSubStyle, marginTop: "4px" }}>
                Check your answers before submitting.
              </div>
              {answerSummary.length > 0 && (
                <div style={summaryStyle}>
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
          ) : (
            <>
              <div style={questionTextStyle}>
                {isClassifier
                  ? "Route by AI"
                  : next.questionText || "(No question text)"}
                {next.required && (
                  <span style={{ color: "red", marginLeft: "4px" }}>*</span>
                )}
              </div>

              {isClassifier && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted, #6b7280)",
                    marginBottom: "12px",
                    fontStyle: "italic",
                  }}
                >
                  In preview, choose a path to test. In production, AI resolves
                  this automatically from visitor info.
                </div>
              )}

              {(isMC || isClassifier) &&
                next.options?.map((opt, idx) => (
                  <div
                    key={opt.id}
                    tabIndex={0}
                    role="option"
                    aria-selected={currentInput === opt.id}
                    style={
                      currentInput === opt.id
                        ? optionCardSelectedStyle
                        : focusedOptIdx === idx
                          ? optionCardFocusedStyle
                          : optionCardStyle
                    }
                    onClick={() => setCurrentInput(opt.id)}
                    onFocus={() => setFocusedOptIdx(idx)}
                    onBlur={() => setFocusedOptIdx(-1)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setCurrentInput(opt.id);
                      }
                    }}
                  >
                    {opt.label}
                  </div>
                ))}

              {isText && (
                <>
                  <textarea
                    style={textareaStyle}
                    placeholder="Type your answer..."
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    disabled={inferring}
                  />
                  {inferring && (
                    <div
                      style={{
                        marginTop: "12px",
                        fontSize: "13px",
                        color: "var(--text-muted, #6b7280)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: "16px",
                          height: "16px",
                          border: "2px solid var(--color-border, #e5e7eb)",
                          borderTopColor: "var(--color-primary, #008080)",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      Analyzing response...
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          {isComplete ? (
            /* Thanks screen — only Close */
            <button
              style={{ ...primaryBtnStyle, marginLeft: "auto" }}
              onClick={onClose}
            >
              Close
            </button>
          ) : isFinish ? (
            /* Summary screen — Back + Submit */
            <>
              <button
                style={{ ...primaryBtnStyle, order: 2 }}
                onClick={handleNext}
              >
                Submit &#8594;
              </button>
              <button
                style={{
                  ...secondaryBtnStyle,
                  order: 1,
                  marginRight: "auto",
                }}
                onClick={handleBack}
              >
                &#8592; Back
              </button>
            </>
          ) : (
            /* Question screen — Next + optional Back */
            <>
              <button
                style={{
                  ...(canAdvance && !inferring
                    ? primaryBtnStyle
                    : disabledBtnStyle),
                  order: 2,
                  marginLeft: answers.length === 0 ? "auto" : undefined,
                }}
                onClick={handleNext}
                disabled={!canAdvance || inferring}
                data-action="next"
              >
                {inferring ? "Analyzing..." : "Next \u2192"}
              </button>
              {answers.length > 0 && (
                <button
                  style={{
                    ...secondaryBtnStyle,
                    order: 1,
                    marginRight: "auto",
                  }}
                  onClick={handleBack}
                >
                  &#8592; Back
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
