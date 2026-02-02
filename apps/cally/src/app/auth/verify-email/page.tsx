"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Suspense, useState } from "react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!email.trim() || !code.trim()) {
      setError("Email and verification code are required");
      setIsSubmitting(false);
      return;
    }

    try {
      console.log("[DBG][verify-email] Submitting verification");

      const res = await fetch("/api/auth/cognito/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Verification failed");
      }

      console.log("[DBG][verify-email] Verification successful");
      setSuccess("Email verified successfully! Redirecting to sign in...");

      // Redirect to sign in after a short delay
      setTimeout(() => {
        router.push("/auth/signin");
      }, 2000);
    } catch (err) {
      console.error("[DBG][verify-email] Error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Please enter your email address");
      setIsResending(false);
      return;
    }

    try {
      console.log("[DBG][verify-email] Resending verification code");

      const res = await fetch("/api/auth/cognito/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to resend code");
      }

      setSuccess("Verification code sent! Check your email.");
    } catch (err) {
      console.error("[DBG][verify-email] Resend error:", err);
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-main)]">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[var(--color-primary)]">
              Verify Your Email
            </h1>
            <p className="text-[var(--text-muted)] mt-2">
              We sent a verification code to your email. Enter it below to
              verify your account.
            </p>
          </div>

          {error && (
            <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 mb-4 bg-green-50 text-green-600 rounded-lg text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--text-body)] mb-1"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="you@example.com"
                required
                disabled={isSubmitting || !!emailParam}
                autoComplete="email"
                className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent disabled:bg-gray-50"
              />
            </div>

            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-[var(--text-body)] mb-1"
              >
                Verification Code
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError(null);
                }}
                placeholder="Enter 6-digit code"
                required
                disabled={isSubmitting}
                autoComplete="one-time-code"
                className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-center text-xl tracking-widest"
                maxLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {isSubmitting ? "Verifying..." : "Verify Email"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              Didn&apos;t receive the code?{" "}
              <button
                onClick={handleResendCode}
                disabled={isResending}
                className="text-[var(--color-primary)] hover:underline disabled:opacity-50"
              >
                {isResending ? "Sending..." : "Resend code"}
              </button>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/auth/signin"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-body)]"
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
