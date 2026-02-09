"use client";

import { useState, useCallback } from "react";
import Modal, { ModalHeader } from "@/components/Modal";
import ContactForm from "./ContactForm";
import ContactConfirmation from "./ContactConfirmation";

type ContactStep = "form" | "confirmed";

interface ContactWidgetProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactWidget({
  tenantId,
  isOpen,
  onClose,
}: ContactWidgetProps) {
  const [step, setStep] = useState<ContactStep>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStep("form");
    setSubmitting(false);
    setError(null);
    setWarning(null);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    // Reset after animation
    setTimeout(resetState, 200);
  }, [onClose, resetState]);

  const handleSubmit = useCallback(
    async (data: {
      name: string;
      email: string;
      message: string;
      _hp: string;
      _t: string;
    }) => {
      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch(`/api/data/tenants/${tenantId}/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            message: data.message,
            _hp: data._hp,
            _t: data._t,
          }),
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
      } catch {
        setError("Failed to send message. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [tenantId],
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="max-w-lg">
      <ModalHeader onClose={handleClose}>
        {step === "form" ? "Contact Us" : "Message Sent"}
      </ModalHeader>

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
    </Modal>
  );
}
