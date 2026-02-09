"use client";

import { useState, useCallback } from "react";
import Modal, { ModalHeader } from "@/components/Modal";
import { DEFAULT_BOOKING_CONFIG } from "@/types/booking";
import type { TimeSlot, AvailableSlotsResponse } from "@/types/booking";
import DatePicker from "./DatePicker";
import TimeSlotGrid from "./TimeSlotGrid";
import BookingForm from "./BookingForm";
import BookingConfirmation from "./BookingConfirmation";

type BookingStep = "date-select" | "time-select" | "form" | "confirmed";

interface BookingWidgetProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingWidget({
  tenantId,
  isOpen,
  onClose,
}: BookingWidgetProps) {
  const [step, setStep] = useState<BookingStep>("date-select");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [timezone, setTimezone] = useState(DEFAULT_BOOKING_CONFIG.timezone);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedSlot, setConfirmedSlot] = useState<TimeSlot | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStep("date-select");
    setSelectedDate(null);
    setSlots([]);
    setSelectedSlot(null);
    setSubmitting(false);
    setError(null);
    setConfirmedSlot(null);
    setWarning(null);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    // Reset after animation
    setTimeout(resetState, 200);
  }, [onClose, resetState]);

  const handleDateSelect = useCallback(
    async (date: string) => {
      setSelectedDate(date);
      setSelectedSlot(null);
      setError(null);
      setSlotsLoading(true);
      setStep("time-select");

      try {
        const res = await fetch(
          `/api/data/tenants/${tenantId}/booking/slots?date=${date}`,
        );
        const json = (await res.json()) as {
          success: boolean;
          data?: AvailableSlotsResponse;
          error?: string;
        };

        if (!json.success || !json.data) {
          setError(json.error ?? "Failed to load slots");
          setSlots([]);
          return;
        }

        setSlots(json.data.slots);
        setTimezone(json.data.timezone);
      } catch {
        setError("Failed to load available times");
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    },
    [tenantId],
  );

  const handleSlotSelect = useCallback((slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep("form");
    setError(null);
  }, []);

  const handleBookingSubmit = useCallback(
    async (data: {
      visitorName: string;
      visitorEmail: string;
      note: string;
      _hp: string;
      _t: string;
    }) => {
      if (!selectedSlot) return;

      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch(`/api/data/tenants/${tenantId}/booking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorName: data.visitorName,
            visitorEmail: data.visitorEmail,
            note: data.note || undefined,
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
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
          setError(json.error ?? "Booking failed");
          return;
        }

        if (json.warning) {
          setWarning(json.warning);
        }
        setConfirmedSlot(selectedSlot);
        setStep("confirmed");
      } catch {
        setError("Booking failed. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [tenantId, selectedSlot],
  );

  const stepTitle = (() => {
    switch (step) {
      case "date-select":
        return "Select a Date";
      case "time-select":
        return "Select a Time";
      case "form":
        return "Your Details";
      case "confirmed":
        return "Request Submitted";
    }
  })();

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="max-w-lg">
      <ModalHeader onClose={handleClose}>{stepTitle}</ModalHeader>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {step === "date-select" && (
        <DatePicker
          bookingConfig={DEFAULT_BOOKING_CONFIG}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />
      )}

      {step === "time-select" && (
        <div>
          <button
            type="button"
            onClick={() => setStep("date-select")}
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 mb-3"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to calendar
          </button>

          {selectedDate && (
            <p className="text-sm text-gray-600 mb-3">
              {new Date(selectedDate + "T12:00:00Z").toLocaleDateString(
                "en-US",
                {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  timeZone: "UTC",
                },
              )}
            </p>
          )}

          <TimeSlotGrid
            slots={slots}
            loading={slotsLoading}
            selectedSlot={selectedSlot}
            onSlotSelect={handleSlotSelect}
            timezone={timezone}
          />
        </div>
      )}

      {step === "form" && (
        <div>
          <button
            type="button"
            onClick={() => setStep("time-select")}
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 mb-3"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to times
          </button>

          {selectedSlot && (
            <div className="bg-indigo-50 rounded-lg p-3 mb-4 text-sm">
              <span className="font-medium text-indigo-900">
                {selectedDate &&
                  new Date(selectedDate + "T12:00:00Z").toLocaleDateString(
                    "en-US",
                    {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    },
                  )}
              </span>
              <span className="text-indigo-700">
                {" "}
                at{" "}
                {new Date(selectedSlot.startTime).toLocaleTimeString("en-US", {
                  timeZone: timezone,
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
          )}

          <BookingForm onSubmit={handleBookingSubmit} submitting={submitting} />
        </div>
      )}

      {step === "confirmed" && confirmedSlot && (
        <BookingConfirmation
          startTime={confirmedSlot.startTime}
          endTime={confirmedSlot.endTime}
          timezone={timezone}
          onClose={handleClose}
          warning={warning ?? undefined}
        />
      )}
    </Modal>
  );
}
