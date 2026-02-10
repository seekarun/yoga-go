"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import type {
  SurveyQuestion,
  SurveyContactInfo,
  SurveyAnswer,
  SurveyResponseContactInfo,
} from "@/types";
import { getNextQuestionId, getStartQuestion } from "@core/lib/survey-flow";

interface SurveyData {
  id: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  contactInfo?: SurveyContactInfo;
}

type Step = "contact" | "question" | "done";

export default function PublicSurveyPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const surveyId = params.surveyId as string;

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

  // Spam protection fields
  const [formTimestamp] = useState(() => Date.now());

  const fetchSurvey = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/data/tenants/${tenantId}/surveys/${surveyId}`,
      );
      const json = await res.json();

      if (json.success && json.data) {
        const data = json.data as SurveyData;
        setSurvey(data);

        // If no contact info to collect, go straight to questions
        const needsContact =
          data.contactInfo &&
          (data.contactInfo.collectName ||
            data.contactInfo.collectEmail ||
            data.contactInfo.collectPhone);

        if (!needsContact) {
          setStep("question");
          const start = getStartQuestion(data.questions);
          setCurrentQuestion(start);
        }
      } else {
        setError(json.error || "Survey not found");
      }
    } catch {
      setError("Failed to load survey");
    } finally {
      setLoading(false);
    }
  }, [tenantId, surveyId]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  const startQuestions = () => {
    if (!survey) return;
    const ci = survey.contactInfo;

    // Validate required contact fields
    if (ci?.collectName && ci.nameRequired && !contactName.trim()) return;
    if (ci?.collectEmail && ci.emailRequired && !contactEmail.trim()) return;
    if (ci?.collectPhone && ci.phoneRequired && !contactPhone.trim()) return;

    setStep("question");
    const start = getStartQuestion(survey.questions);
    setCurrentQuestion(start);
  };

  const handleNext = () => {
    if (!currentQuestion || !survey) return;

    // Finish nodes don't collect answers — just submit
    if (currentQuestion.type === "finish") {
      submitSurvey(answers);
      return;
    }

    // Validate required
    if (currentQuestion.required && !currentAnswer.trim()) return;

    // Record answer
    const newAnswer: SurveyAnswer = {
      questionId: currentQuestion.id,
      answer: currentAnswer.trim(),
    };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    // Determine next question via branching
    const nextId = getNextQuestionId(currentQuestion, currentAnswer.trim());
    if (nextId) {
      const nextQ = survey.questions.find((q) => q.id === nextId);
      if (nextQ) {
        // If next is a finish node, show it (don't skip)
        setCurrentQuestion(nextQ);
        setCurrentAnswer("");
        return;
      }
    }

    // No more questions — submit
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

  // Progress: count answered vs total reachable (simple approximation)
  const questionCount = survey?.questions.length ?? 0;
  const answeredCount = answers.length;
  const progressPct =
    questionCount > 0 ? Math.round((answeredCount / questionCount) * 100) : 0;

  /* ─────────────── Render states ─────────────── */

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <p style={{ color: "#666", textAlign: "center" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center" }}>
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
          </div>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center" }}>
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
            <h1 style={headingStyle}>Thank You!</h1>
            <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.6" }}>
              Your response has been submitted. We appreciate your time!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!survey) return null;

  /* ─── Contact Info Step ─── */
  if (step === "contact") {
    const ci = survey.contactInfo!;
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={headingStyle}>{survey.title}</h1>
          {survey.description && <p style={descStyle}>{survey.description}</p>}

          <p style={{ ...descStyle, marginBottom: "24px" }}>
            Before we begin, please provide your contact details.
          </p>

          {ci.collectName && (
            <div style={fieldWrapperStyle}>
              <label style={labelStyle}>
                Name{ci.nameRequired ? " *" : ""}
              </label>
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

          <button
            type="button"
            onClick={startQuestions}
            style={primaryBtnStyle}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  /* ─── Question Step ─── */
  if (!currentQuestion) return null;

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Progress bar */}
        <div style={progressBarBgStyle}>
          <div style={{ ...progressBarFillStyle, width: `${progressPct}%` }} />
        </div>

        <p style={{ fontSize: "13px", color: "#999", marginBottom: "8px" }}>
          Question {answeredCount + 1} of {questionCount}
        </p>

        {currentQuestion.type === "finish" ? (
          <>
            {/* Finish message */}
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

            {/* Answer input */}
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
                submitting ||
                (currentQuestion.required && !currentAnswer.trim())
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
      </div>
    </div>
  );
}

/* ─────────────── Styles ─────────────── */

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  background: "#f5f5f5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "520px",
  background: "#ffffff",
  borderRadius: "16px",
  padding: "40px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
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
