"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

interface VisitorSignupFormProps {
  tenantId: string;
  tenantName: string;
}

type Mode = "signup" | "signin";

export default function VisitorSignupForm({
  tenantId,
  tenantName,
}: VisitorSignupFormProps) {
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get("email") || "";
  const initialMode =
    searchParams.get("mode") === "signin" ? "signin" : "signup";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signInSuccess, setSignInSuccess] = useState(false);

  // Full page navigation so AuthContext re-fetches session from the new cookie
  if (signInSuccess) {
    window.location.href = `/${tenantId}`;
    return null;
  }

  return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>{mode === "signup" ? "Sign Up" : "Sign In"}</h2>
      <p style={subtitleStyle}>
        {mode === "signup"
          ? `Create an account with ${tenantName} for exclusive discounts`
          : `Sign in to subscribe to ${tenantName}`}
      </p>

      {error && <div style={errorStyle}>{error}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === "signup") {
            handleSignup();
          } else {
            handleSignin();
          }
        }}
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        {mode === "signup" && (
          <div>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              style={inputStyle}
            />
          </div>
        )}

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
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            style={inputStyle}
          />
        </div>

        {mode === "signup" && (
          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
              style={inputStyle}
            />
          </div>
        )}

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading
            ? "Please wait..."
            : mode === "signup"
              ? "Create Account"
              : "Sign In"}
        </button>
      </form>

      <div style={dividerStyle}>
        <span style={dividerTextStyle}>or</span>
      </div>

      <a
        href={`/api/auth/google?callbackUrl=/${tenantId}&visitorTenantId=${tenantId}`}
        style={googleButtonStyle}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          style={{ marginRight: "8px" }}
        >
          <path
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
            fill="#4285F4"
          />
          <path
            d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
            fill="#34A853"
          />
          <path
            d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9s0 .001 0 0a9 9 0 0 0 .957 4.042l3.007-2.332z"
            fill="#FBBC05"
          />
          <path
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </a>

      <p style={toggleStyle}>
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError("");
              }}
              style={linkButtonStyle}
            >
              Sign In
            </button>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              style={linkButtonStyle}
            >
              Sign Up
            </button>
          </>
        )}
      </p>
    </div>
  );

  function handleSignup() {
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    fetch(`/api/data/tenants/${tenantId}/subscribers/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          window.location.href = `/${tenantId}/verify-email?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
        } else if (data.code === "USER_EXISTS") {
          setError(
            "An account with this email already exists. Try signing in instead.",
          );
        } else {
          setError(data.error || "Signup failed. Please try again.");
        }
      })
      .catch(() => {
        setError("Something went wrong. Please try again.");
      })
      .finally(() => setLoading(false));
  }

  function handleSignin() {
    setLoading(true);
    setError("");

    fetch(`/api/data/tenants/${tenantId}/subscribers/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSignInSuccess(true);
        } else if (data.code === "NOT_VERIFIED") {
          window.location.href = `/${tenantId}/verify-email?email=${encodeURIComponent(email)}`;
        } else {
          setError(data.error || "Sign in failed. Please try again.");
        }
      })
      .catch(() => {
        setError("Something went wrong. Please try again.");
      })
      .finally(() => setLoading(false));
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

const googleButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  padding: "12px",
  background: "#ffffff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "15px",
  fontWeight: "500",
  cursor: "pointer",
  textDecoration: "none",
};

const dividerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  margin: "20px 0",
  gap: "12px",
};

const dividerTextStyle: React.CSSProperties = {
  flex: "none",
  fontSize: "13px",
  color: "#9ca3af",
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

const toggleStyle: React.CSSProperties = {
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
