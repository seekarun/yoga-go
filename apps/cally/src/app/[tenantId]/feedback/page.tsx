"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";

interface FeedbackInfo {
  recipientName: string;
  status: "pending" | "submitted";
  tenantName: string;
}

export default function FeedbackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantId = params.tenantId as string;
  const token = searchParams.get("token");

  const [info, setInfo] = useState<FeedbackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [consentToShowcase, setConsentToShowcase] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fetchInfo = useCallback(async () => {
    if (!token) {
      setError("Invalid feedback link — no token provided.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/data/tenants/${tenantId}/feedback?token=${encodeURIComponent(token)}`,
      );
      const json = await res.json();

      if (json.success && json.data) {
        setInfo(json.data);
        if (json.data.status === "submitted") {
          setSubmitted(true);
        }
      } else {
        setError(json.error || "Invalid feedback link");
      }
    } catch {
      setError("Failed to load feedback form");
    } finally {
      setLoading(false);
    }
  }, [tenantId, token]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    if (!message.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/data/tenants/${tenantId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          rating,
          message: message.trim(),
          consentToShowcase,
        }),
      });
      const json = await res.json();

      if (json.success) {
        setSubmitted(true);
      } else {
        setError(json.error || "Failed to submit feedback");
      }
    } catch {
      setError("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

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

  if (submitted) {
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
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "700",
                color: "#1a1a1a",
                marginBottom: "8px",
              }}
            >
              Thank You!
            </h1>
            <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.6" }}>
              Your feedback has been submitted.
              {info?.tenantName && (
                <> {info.tenantName} appreciates you taking the time!</>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#1a1a1a",
              marginBottom: "8px",
            }}
          >
            Share Your Feedback
          </h1>
          {info?.tenantName && (
            <p style={{ color: "#666", fontSize: "16px" }}>
              {info.tenantName} would love to hear about your experience
            </p>
          )}
        </div>

        {/* Star Rating */}
        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "600",
              color: "#333",
              marginBottom: "8px",
            }}
          >
            Rating
          </label>
          <div style={{ display: "flex", gap: "4px" }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  transition: "transform 0.15s",
                  transform:
                    star <= (hoverRating || rating) ? "scale(1.1)" : "scale(1)",
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill={star <= (hoverRating || rating) ? "#f59e0b" : "#d1d5db"}
                  stroke="none"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            ))}
          </div>
          {rating === 0 && (
            <p
              style={{
                fontSize: "13px",
                color: "#999",
                marginTop: "4px",
              }}
            >
              Click a star to rate
            </p>
          )}
        </div>

        {/* Message */}
        <div style={{ marginBottom: "24px" }}>
          <label
            htmlFor="feedback-message"
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "600",
              color: "#333",
              marginBottom: "8px",
            }}
          >
            Your Feedback
          </label>
          <textarea
            id="feedback-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us about your experience..."
            rows={5}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "15px",
              lineHeight: "1.5",
              resize: "vertical",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Consent */}
        <div style={{ marginBottom: "32px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              cursor: "pointer",
              fontSize: "14px",
              color: "#555",
              lineHeight: "1.5",
            }}
          >
            <input
              type="checkbox"
              checked={consentToShowcase}
              onChange={(e) => setConsentToShowcase(e.target.checked)}
              style={{
                marginTop: "3px",
                width: "18px",
                height: "18px",
                cursor: "pointer",
                flexShrink: 0,
              }}
            />
            I agree to have my feedback displayed on the website
          </label>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || rating === 0 || !message.trim()}
          style={{
            width: "100%",
            padding: "14px",
            background: rating === 0 || !message.trim() ? "#d1d5db" : "#8b5cf6",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: rating === 0 || !message.trim() ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {submitting ? "Submitting..." : "Submit Feedback"}
        </button>
      </div>
    </div>
  );
}

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
