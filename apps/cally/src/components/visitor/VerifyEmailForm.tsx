"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

interface VerifyEmailFormProps {
  tenantId: string;
  tenantName: string;
}

export default function VerifyEmailForm({
  tenantId,
  tenantName,
}: VerifyEmailFormProps) {
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get("email") || "";
  const prefillName = searchParams.get("name") || "";

  const [email, setEmail] = useState(prefillEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [verified, setVerified] = useState(false);

  if (verified) {
    return (
      <div style={cardStyle}>
        <div style={successIconStyle}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 style={titleStyle}>Welcome!</h2>
        <p style={subtitleStyle}>
          You&apos;re signed up with <strong>{tenantName}</strong>. Check your
          email for a welcome message with exclusive offers.
        </p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>Verify Your Email</h2>
      <p style={subtitleStyle}>
        We&apos;ve sent a 6-digit verification code to your email. Enter it
        below to complete your signup.
      </p>

      {error && <div style={errorStyle}>{error}</div>}
      {resendMessage && <div style={infoStyle}>{resendMessage}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleVerify();
        }}
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Verification Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter 6-digit code"
            required
            maxLength={6}
            pattern="[0-9]{6}"
            style={{
              ...inputStyle,
              letterSpacing: "4px",
              textAlign: "center",
              fontSize: "18px",
            }}
          />
        </div>

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Verifying..." : "Verify"}
        </button>
      </form>

      <p style={resendStyle}>
        Didn&apos;t receive the code?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          style={linkButtonStyle}
        >
          {resending ? "Sending..." : "Resend code"}
        </button>
      </p>
    </div>
  );

  function handleVerify() {
    if (code.length !== 6) {
      setError("Please enter a 6-digit verification code");
      return;
    }

    setLoading(true);
    setError("");

    fetch(`/api/data/tenants/${tenantId}/subscribers/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, name: prefillName }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setVerified(true);
        } else {
          setError(data.error || "Verification failed. Please try again.");
        }
      })
      .catch(() => {
        setError("Something went wrong. Please try again.");
      })
      .finally(() => setLoading(false));
  }

  function handleResend() {
    setResending(true);
    setResendMessage("");
    setError("");

    fetch(`/api/auth/cognito/resend-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setResendMessage(
            "A new verification code has been sent to your email.",
          );
        } else {
          setError(data.error || "Failed to resend code. Please try again.");
        }
      })
      .catch(() => {
        setError("Something went wrong. Please try again.");
      })
      .finally(() => setResending(false));
  }
}

// Styles
const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  padding: "40px",
  width: "100%",
  maxWidth: "420px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#1e293b",
  margin: "0 0 8px 0",
  textAlign: "center",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0 0 24px 0",
  textAlign: "center",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "14px",
  fontWeight: "500",
  color: "#374151",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  background: "#4f46e5",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  fontSize: "15px",
  fontWeight: "600",
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "12px",
  color: "#dc2626",
  fontSize: "14px",
  marginBottom: "16px",
};

const infoStyle: React.CSSProperties = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  padding: "12px",
  color: "#1d4ed8",
  fontSize: "14px",
  marginBottom: "16px",
};

const resendStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: "14px",
  color: "#64748b",
  marginTop: "16px",
};

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#4f46e5",
  fontWeight: "600",
  cursor: "pointer",
  padding: "0",
  fontSize: "14px",
};

const successIconStyle: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "16px",
};
