"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  SurveyQuestion,
  SurveyContactInfo,
  SurveyAnswer,
  SurveyResponseContactInfo,
} from "@/types";
import type { VisitorInfo } from "@core/types";
import { getNextQuestionId, getStartQuestion } from "@core/lib/survey-flow";
import { classifyVisitor } from "@/lib/survey-classify";

interface SurveyData {
  id: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  contactInfo?: SurveyContactInfo;
  visitorInfo?: VisitorInfo;
}

type Step = "contact" | "question" | "done";

interface SurveyOverlayProps {
  tenantId: string;
  surveyId: string;
  onClose: () => void;
}

export default function SurveyOverlay({
  tenantId,
  surveyId,
  onClose,
}: SurveyOverlayProps) {
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Contact info
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Question flow
  const [currentQuestion, setCurrentQuestion] = useState<SurveyQuestion | null>(
    null,
  );
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [step, setStep] = useState<Step>("contact");
  const [submitting, setSubmitting] = useState(false);

  // Spam protection
  const [formTimestamp] = useState(() => Date.now());

  /**
   * Advance past consecutive classifier nodes, calling AI to resolve each one.
   */
  const advancePastClassifiers = useCallback(
    async (
      question: SurveyQuestion | null,
      currentAnswers: SurveyAnswer[],
      visitorInfo: VisitorInfo | undefined,
      questions: SurveyQuestion[],
    ): Promise<{
      question: SurveyQuestion | null;
      answers: SurveyAnswer[];
    }> => {
      let q = question;
      let acc = [...currentAnswers];
      const seen = new Set<string>();
      while (q && q.type === "classifier") {
        if (seen.has(q.id)) break;
        seen.add(q.id);
        const opts = (q.options ?? []).map((o) => ({
          id: o.id,
          label: o.label,
        }));
        const optionId = await classifyVisitor(
          tenantId,
          surveyId,
          visitorInfo ?? {},
          opts,
        );
        acc = [...acc, { questionId: q.id, answer: optionId ?? "" }];
        const nextId = getNextQuestionId(q, optionId ?? undefined);
        q = nextId ? (questions.find((qn) => qn.id === nextId) ?? null) : null;
      }
      return { question: q, answers: acc };
    },
    [tenantId, surveyId],
  );

  const fetchSurvey = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/data/tenants/${tenantId}/surveys/${surveyId}`,
      );
      const json = await res.json();

      if (json.success && json.data) {
        const data = json.data as SurveyData;
        setSurvey(data);

        const needsContact =
          data.contactInfo &&
          (data.contactInfo.collectName ||
            data.contactInfo.collectEmail ||
            data.contactInfo.collectPhone);

        if (!needsContact) {
          setStep("question");
          const start = getStartQuestion(data.questions);
          const { question: firstVisible, answers: classifierAnswers } =
            await advancePastClassifiers(
              start,
              [],
              data.visitorInfo,
              data.questions,
            );
          setCurrentQuestion(firstVisible);
          if (classifierAnswers.length > 0) setAnswers(classifierAnswers);
        }
      } else {
        setError(json.error || "Survey not found");
      }
    } catch {
      setError("Failed to load survey");
    } finally {
      setLoading(false);
    }
  }, [tenantId, surveyId, advancePastClassifiers]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const startQuestions = async () => {
    if (!survey) return;
    const ci = survey.contactInfo;

    if (ci?.collectName && ci.nameRequired && !contactName.trim()) return;
    if (ci?.collectEmail && ci.emailRequired && !contactEmail.trim()) return;
    if (ci?.collectPhone && ci.phoneRequired && !contactPhone.trim()) return;

    setStep("question");
    const start = getStartQuestion(survey.questions);
    const { question: firstVisible, answers: classifierAnswers } =
      await advancePastClassifiers(
        start,
        [],
        survey.visitorInfo,
        survey.questions,
      );
    setCurrentQuestion(firstVisible);
    if (classifierAnswers.length > 0) setAnswers(classifierAnswers);
  };

  const handleNext = async () => {
    if (!currentQuestion || !survey) return;

    if (currentQuestion.type === "finish") {
      submitSurvey(answers);
      return;
    }

    if (currentQuestion.required && !currentAnswer.trim()) return;

    const newAnswer: SurveyAnswer = {
      questionId: currentQuestion.id,
      answer: currentAnswer.trim(),
    };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    const nextId = getNextQuestionId(currentQuestion, currentAnswer.trim());
    if (nextId) {
      const nextQ = survey.questions.find((q) => q.id === nextId) ?? null;
      if (nextQ) {
        const { question: visibleQ, answers: classifierAnswers } =
          await advancePastClassifiers(
            nextQ,
            updatedAnswers,
            survey.visitorInfo,
            survey.questions,
          );
        if (classifierAnswers.length > updatedAnswers.length) {
          setAnswers(classifierAnswers);
        }
        if (visibleQ) {
          setCurrentQuestion(visibleQ);
          setCurrentAnswer("");
          return;
        }
        submitSurvey(classifierAnswers);
        return;
      }
    }

    submitSurvey(updatedAnswers);
  };

  const submitSurvey = async (finalAnswers: SurveyAnswer[]) => {
    setSubmitting(true);
    try {
      const contactInfo: SurveyResponseContactInfo = {};
      if (contactName.trim()) contactInfo.name = contactName.trim();
      if (contactEmail.trim()) contactInfo.email = contactEmail.trim();
      if (contactPhone.trim()) contactInfo.phone = contactPhone.trim();

      const res = await fetch(
        `/api/data/tenants/${tenantId}/surveys/${surveyId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: finalAnswers,
            contactInfo:
              Object.keys(contactInfo).length > 0 ? contactInfo : undefined,
            _hp: "",
            _ts: formTimestamp,
          }),
        },
      );
      const json = await res.json();

      if (json.success) {
        setStep("done");
      } else {
        setError(json.error || "Failed to submit survey");
      }
    } catch {
      setError("Failed to submit survey");
    } finally {
      setSubmitting(false);
    }
  };

  const questionCount =
    survey?.questions.filter((q) => q.type !== "classifier").length ?? 0;
  const answeredCount = answers.filter((a) => {
    const q = survey?.questions.find((q) => q.id === a.questionId);
    return q?.type !== "classifier";
  }).length;
  const progressPct =
    questionCount > 0 ? Math.round((answeredCount / questionCount) * 100) : 0;

  /* ─────────────── Render ─────────────── */

  const renderCard = (children: React.ReactNode) => (
    <div style={backdropStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          style={closeBtnStyle}
          aria-label="Close survey"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );

  if (loading) {
    return renderCard(
      <p style={{ color: "#666", textAlign: "center", padding: "40px 0" }}>
        Loading...
      </p>,
    );
  }

  if (error) {
    return renderCard(
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ef4444"
          strokeWidth="1.5"
          style={{ margin: "0 auto 16px" }}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
        <p style={{ color: "#ef4444", fontSize: "16px" }}>{error}</p>
      </div>,
    );
  }

  if (step === "done") {
    return renderCard(
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#10b981"
          strokeWidth="1.5"
          style={{ margin: "0 auto 16px" }}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <h2 style={headingStyle}>Thank You!</h2>
        <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.6" }}>
          Your response has been submitted. We appreciate your time!
        </p>
        <button type="button" onClick={onClose} style={primaryBtnStyle}>
          Close
        </button>
      </div>,
    );
  }

  if (!survey) return null;

  /* ─── Contact Info Step ─── */
  if (step === "contact") {
    const ci = survey.contactInfo!;
    return renderCard(
      <>
        <h2 style={headingStyle}>{survey.title}</h2>
        {survey.description && <p style={descStyle}>{survey.description}</p>}

        <p style={{ ...descStyle, marginBottom: "24px" }}>
          Before we begin, please provide your contact details.
        </p>

        {ci.collectName && (
          <div style={fieldWrapperStyle}>
            <label style={labelStyle}>Name{ci.nameRequired ? " *" : ""}</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              style={inputStyle}
              placeholder="Your name"
            />
          </div>
        )}

        {ci.collectEmail && (
          <div style={fieldWrapperStyle}>
            <label style={labelStyle}>
              Email{ci.emailRequired ? " *" : ""}
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              style={inputStyle}
              placeholder="you@example.com"
            />
          </div>
        )}

        {ci.collectPhone && (
          <div style={fieldWrapperStyle}>
            <label style={labelStyle}>
              Phone{ci.phoneRequired ? " *" : ""}
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              style={inputStyle}
              placeholder="Your phone number"
            />
          </div>
        )}

        <button type="button" onClick={startQuestions} style={primaryBtnStyle}>
          Continue
        </button>
      </>,
    );
  }

  /* ─── Question Step ─── */
  if (!currentQuestion) return null;

  return renderCard(
    <>
      {/* Progress bar */}
      <div style={progressBarBgStyle}>
        <div style={{ ...progressBarFillStyle, width: `${progressPct}%` }} />
      </div>

      <p style={{ fontSize: "13px", color: "#999", marginBottom: "8px" }}>
        Question {answeredCount + 1} of {questionCount}
      </p>

      {currentQuestion.type === "finish" ? (
        <>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#10b981"
              strokeWidth="1.5"
              style={{ margin: "0 auto 16px" }}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <p
              style={{
                fontSize: "18px",
                color: "#1a1a1a",
                lineHeight: "1.6",
              }}
            >
              {currentQuestion.questionText || "Thank you for your time"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            style={primaryBtnStyle}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </>
      ) : (
        <>
          <h2 style={questionTextStyle}>
            {currentQuestion.questionText}
            {currentQuestion.required && (
              <span style={{ color: "#ef4444" }}> *</span>
            )}
          </h2>

          {currentQuestion.type === "text" ? (
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              style={{
                ...inputStyle,
                minHeight: 100,
                resize: "vertical",
                marginBottom: "24px",
              }}
              placeholder="Type your answer..."
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginBottom: "24px",
              }}
            >
              {(currentQuestion.options ?? []).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCurrentAnswer(opt.id)}
                  style={{
                    ...optionBtnStyle,
                    borderColor:
                      currentAnswer === opt.id ? "#8b5cf6" : "#d1d5db",
                    background: currentAnswer === opt.id ? "#f5f3ff" : "#fff",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={
              submitting || (currentQuestion.required && !currentAnswer.trim())
            }
            style={{
              ...primaryBtnStyle,
              opacity:
                currentQuestion.required && !currentAnswer.trim() ? 0.5 : 1,
              cursor:
                currentQuestion.required && !currentAnswer.trim()
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {submitting ? "Submitting..." : "Next"}
          </button>
        </>
      )}
    </>,
  );
}

/* ─────────────── Styles ─────────────── */

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  zIndex: 9999,
  animation: "surveyOverlayFadeIn 0.2s ease-out",
};

const cardStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: "520px",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#ffffff",
  borderRadius: "16px",
  padding: "40px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: "16px",
  right: "16px",
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "rgba(0,0,0,0.05)",
  borderRadius: "50%",
  cursor: "pointer",
  color: "#666",
  transition: "background 0.15s",
};

const headingStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#1a1a1a",
  marginBottom: "8px",
  textAlign: "center",
};

const descStyle: React.CSSProperties = {
  color: "#666",
  fontSize: "16px",
  lineHeight: "1.6",
  textAlign: "center",
};

const fieldWrapperStyle: React.CSSProperties = {
  marginBottom: "16px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "14px",
  fontWeight: "600",
  color: "#333",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "15px",
  lineHeight: "1.5",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const primaryBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  background: "#8b5cf6",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "background 0.2s",
};

const optionBtnStyle: React.CSSProperties = {
  padding: "12px 16px",
  border: "2px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "15px",
  textAlign: "left",
  cursor: "pointer",
  transition: "all 0.15s",
  background: "#fff",
};

const progressBarBgStyle: React.CSSProperties = {
  height: "4px",
  background: "#e5e7eb",
  borderRadius: "2px",
  marginBottom: "20px",
  overflow: "hidden",
};

const progressBarFillStyle: React.CSSProperties = {
  height: "100%",
  background: "#8b5cf6",
  borderRadius: "2px",
  transition: "width 0.3s ease",
};

const questionTextStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "600",
  color: "#1a1a1a",
  marginBottom: "24px",
  lineHeight: "1.4",
};
