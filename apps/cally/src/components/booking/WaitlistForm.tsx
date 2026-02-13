"use client";

import { useState, useCallback } from "react";

interface WaitlistFormProps {
  tenantId: string;
  selectedDate: string;
}

export default function WaitlistForm({
  tenantId,
  selectedDate,
}: WaitlistFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    position: number;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !email.trim()) return;

      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/data/tenants/${tenantId}/booking/waitlist`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: selectedDate,
              visitorName: name.trim(),
              visitorEmail: email.trim(),
              ...(phone.trim() && { visitorPhone: phone.trim() }),
            }),
          },
        );

        const json = (await res.json()) as {
          success: boolean;
          data?: { position: number; message: string };
          error?: string;
        };

        if (!json.success) {
          setError(json.error ?? "Failed to join waitlist");
          return;
        }

        if (json.data) {
          setResult(json.data);
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [tenantId, selectedDate, name, email, phone],
  );

  // Success state
  if (result) {
    return (
      <div className="text-center w-full">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mb-3">
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">{result.message}</p>
      </div>
    );
  }

  // Notify Me button
  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors"
        style={{ backgroundColor: "var(--brand-500, #6366f1)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--brand-600, #4f46e5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--brand-500, #6366f1)";
        }}
      >
        Notify Me When Available
      </button>
    );
  }

  // Inline form
  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <p className="text-xs text-gray-500 text-center">
        Get notified when a slot opens up
      </p>

      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />

      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />

      <input
        type="tel"
        placeholder="Phone (optional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />

      {error && <p className="text-xs text-red-600 text-center">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="flex-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !name.trim() || !email.trim()}
          className="flex-1 px-3 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-500, #6366f1)" }}
          onMouseEnter={(e) => {
            if (!submitting) {
              e.currentTarget.style.backgroundColor =
                "var(--brand-600, #4f46e5)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--brand-500, #6366f1)";
          }}
        >
          {submitting ? "Joining..." : "Join Waitlist"}
        </button>
      </div>
    </form>
  );
}
