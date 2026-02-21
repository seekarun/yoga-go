"use client";

import { useState, useEffect, useCallback } from "react";
import Modal, { ModalHeader } from "@/components/Modal";
import type { WebinarSession } from "@/lib/webinar/schedule";

interface WebinarSignupProps {
  tenantId: string;
  productId?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface WebinarDetails {
  id: string;
  name: string;
  description?: string;
  price: number;
  color?: string;
  maxParticipants?: number;
  signupCount: number;
  spotsRemaining: number | null;
  sessions: WebinarSession[];
  timezone: string;
}

export default function WebinarSignup({
  tenantId,
  productId,
  isOpen,
  onClose,
}: WebinarSignupProps) {
  const [step, setStep] = useState<"details" | "confirmed">("details");
  const [webinar, setWebinar] = useState<WebinarDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [note, setNote] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [formLoadedAt] = useState(Date.now());

  // Fetch webinar details
  useEffect(() => {
    if (!isOpen || !productId) return;

    setLoading(true);
    setError(null);
    setStep("details");
    setVisitorName("");
    setVisitorEmail("");
    setNote("");

    fetch(`/api/data/tenants/${tenantId}/webinar/${productId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setWebinar(json.data);
        } else {
          setError(json.error || "Failed to load webinar");
        }
      })
      .catch(() => setError("Failed to load webinar"))
      .finally(() => setLoading(false));
  }, [isOpen, tenantId, productId]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!productId || !webinar) return;

      setError(null);
      setSubmitting(true);

      try {
        const res = await fetch(
          `/api/data/tenants/${tenantId}/webinar/${productId}/signup`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              visitorName: visitorName.trim(),
              visitorEmail: visitorEmail.trim(),
              note: note.trim() || undefined,
              _hp: honeypot,
              _t: formLoadedAt,
            }),
          },
        );

        const json = await res.json();
        if (!json.success) {
          setError(json.error || "Failed to sign up");
          return;
        }

        if (json.data.requiresPayment) {
          // Stripe integration can be added later
          setError(
            "Payment processing is not yet available for webinars. Please contact the host.",
          );
          return;
        }

        setStep("confirmed");
      } catch {
        setError("Failed to sign up");
      } finally {
        setSubmitting(false);
      }
    },
    [
      tenantId,
      productId,
      webinar,
      visitorName,
      visitorEmail,
      note,
      honeypot,
      formLoadedAt,
    ],
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (isoStr: string, timezone: string) => {
    return new Date(isoStr).toLocaleTimeString("en-AU", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const isFull =
    webinar?.spotsRemaining !== null && webinar?.spotsRemaining === 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <ModalHeader onClose={onClose}>{webinar?.name || "Webinar"}</ModalHeader>

      {loading && (
        <div className="py-8 text-center text-[var(--text-muted)]">
          Loading...
        </div>
      )}

      {!loading && error && step === "details" && !webinar && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {!loading && webinar && step === "details" && (
        <div className="space-y-4">
          {/* Description */}
          {webinar.description && (
            <p className="text-sm text-[var(--text-muted)]">
              {webinar.description}
            </p>
          )}

          {/* Schedule */}
          <div>
            <h3 className="text-sm font-medium text-[var(--text-main)] mb-2">
              Schedule
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {webinar.sessions.map((session, i) => (
                <div
                  key={session.date}
                  className="flex items-center gap-2 text-sm py-1.5 px-3 bg-gray-50 rounded-lg"
                >
                  <span className="font-medium text-[var(--text-muted)] w-5 text-xs">
                    {i + 1}.
                  </span>
                  <span className="text-[var(--text-main)]">
                    {formatDate(session.date)}
                  </span>
                  <span className="text-[var(--text-muted)] text-xs">
                    {formatTime(session.startTime, webinar.timezone)} –{" "}
                    {formatTime(session.endTime, webinar.timezone)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Price + Spots */}
          <div className="flex items-center justify-between text-sm">
            <span
              className="font-semibold"
              style={{ color: webinar.color || "var(--color-primary)" }}
            >
              {formatPrice(webinar.price)}
            </span>
            {webinar.spotsRemaining !== null && (
              <span className="text-[var(--text-muted)]">
                {webinar.spotsRemaining} spot
                {webinar.spotsRemaining !== 1 ? "s" : ""} remaining
              </span>
            )}
          </div>

          {/* Full message */}
          {isFull && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 text-center">
              This webinar is full.
            </div>
          )}

          {/* Signup Form */}
          {!isFull && (
            <form
              onSubmit={handleSubmit}
              className="space-y-3 pt-2 border-t border-[var(--color-border)]"
            >
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="signup-name"
                  className="block text-sm font-medium text-[var(--text-muted)] mb-1"
                >
                  Name *
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-sm font-medium text-[var(--text-muted)] mb-1"
                >
                  Email *
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="signup-note"
                  className="block text-sm font-medium text-[var(--text-muted)] mb-1"
                >
                  Note (optional)
                </label>
                <textarea
                  id="signup-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Any questions or comments"
                  rows={2}
                  className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                />
              </div>

              {/* Honeypot — hidden from humans */}
              <input
                type="text"
                name="_hp"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                style={{ position: "absolute", left: "-9999px" }}
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2.5 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{
                  backgroundColor: webinar.color || "var(--color-primary)",
                }}
              >
                {submitting
                  ? "Signing up..."
                  : webinar.price > 0
                    ? `Sign Up — ${formatPrice(webinar.price)}`
                    : "Sign Up — Free"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Confirmation */}
      {step === "confirmed" && (
        <div className="py-6 text-center space-y-3">
          <div className="text-3xl">&#10003;</div>
          <h3 className="text-lg font-semibold text-[var(--text-main)]">
            You&apos;re signed up!
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            You&apos;ve been registered for {webinar?.name}. Check your email
            for confirmation.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: webinar?.color || "var(--color-primary)",
            }}
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}
