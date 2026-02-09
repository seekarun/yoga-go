"use client";

import { useState, useCallback } from "react";
import { useEmbedMessaging } from "@/hooks/useEmbedMessaging";
import ContactForm from "./ContactForm";
import ContactConfirmation from "./ContactConfirmation";

type ContactStep = "form" | "confirmed";

interface EmbedContactWidgetProps {
  tenantId: string;
}

export default function EmbedContactWidget({
  tenantId,
}: EmbedContactWidgetProps) {
  const { notifyClose, notifyContacted } = useEmbedMessaging("contact");

  const [step, setStep] = useState<ContactStep>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    notifyClose();
  }, [notifyClose]);

  const handleSubmit = useCallback(
    async (data: { name: string; email: string; message: string }) => {
      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch(`/api/data/tenants/${tenantId}/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const json = (await res.json()) as {
          success: boolean;
          error?: string;
          warning?: string;
        };

        if (!json.success) {
          setError(json.error ?? "Failed to send message");
          return;
        }

        if (json.warning) {
          setWarning(json.warning);
        }
        setStep("confirmed");
        notifyContacted();
      } catch {
        setError("Failed to send message. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [tenantId, notifyContacted],
  );

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {step === "form" ? "Contact Us" : "Message Sent"}
        </h2>
        <button
          type="button"
          onClick={handleClose}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {step === "form" && (
          <ContactForm onSubmit={handleSubmit} submitting={submitting} />
        )}

        {step === "confirmed" && (
          <ContactConfirmation
            onClose={handleClose}
            warning={warning ?? undefined}
          />
        )}
      </div>
    </div>
  );
}
