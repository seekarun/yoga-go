"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Modal, { ModalHeader } from "@/components/Modal";
import { DEFAULT_BOOKING_CONFIG } from "@/types/booking";
import type {
  TimeSlot,
  AvailableSlotsResponse,
  BookingConfig,
} from "@/types/booking";
import { useVisitorTimezone } from "@/hooks/useVisitorTimezone";
import DayTimelineView from "./DayTimelineView";
import BookingForm from "./BookingForm";
import BookingConfirmation from "./BookingConfirmation";
import StripeCheckoutView from "./StripeCheckout";
import {
  getTodayInTimezone,
  getMaxDate,
  findFirstBusinessDay,
} from "./dateUtils";

type BookingStep = "schedule" | "form" | "payment" | "confirmed";

interface BookingWidgetProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  productName?: string;
}

export default function BookingWidget({
  tenantId,
  isOpen,
  onClose,
  productId,
  productName,
}: BookingWidgetProps) {
  const searchParams = useSearchParams();
  const waitlistDate = searchParams.get("date");
  const waitlistId = searchParams.get("waitlist");
  const [visitorTimezone] = useVisitorTimezone();
  const [bookingConfig, setBookingConfig] = useState(DEFAULT_BOOKING_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);

  const todayStr = getTodayInTimezone(bookingConfig.timezone);
  const maxDate = useMemo(
    () => getMaxDate(todayStr, bookingConfig.lookaheadDays),
    [todayStr, bookingConfig.lookaheadDays],
  );

  const initialDate = useMemo(() => {
    // If returning from a waitlist email, use the date from the URL
    if (waitlistDate && /^\d{4}-\d{2}-\d{2}$/.test(waitlistDate)) {
      return waitlistDate;
    }
    return (
      findFirstBusinessDay(
        todayStr,
        bookingConfig.weeklySchedule,
        todayStr,
        maxDate,
      ) ?? todayStr
    );
  }, [todayStr, bookingConfig.weeklySchedule, maxDate, waitlistDate]);

  const [step, setStep] = useState<BookingStep>("schedule");
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [timezone, setTimezone] = useState(
    visitorTimezone || bookingConfig.timezone,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedSlot, setConfirmedSlot] = useState<TimeSlot | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<
    string | null
  >(null);
  const [pendingPaymentInfo, setPendingPaymentInfo] = useState<{
    eventId: string;
    date: string;
    checkoutSessionId: string;
  } | null>(null);

  const resetState = useCallback(() => {
    setStep("schedule");
    setSelectedDate(initialDate);
    setSlots([]);
    setSelectedSlot(null);
    setSubmitting(false);
    setError(null);
    setConfirmedSlot(null);
    setWarning(null);
    setCheckoutClientSecret(null);
    setPendingPaymentInfo(null);
  }, [initialDate]);

  const fetchSlots = useCallback(
    async (date: string) => {
      setSlotsLoading(true);
      setError(null);

      try {
        const slotsUrl = productId
          ? `/api/data/tenants/${tenantId}/booking/slots?date=${date}&productId=${productId}`
          : `/api/data/tenants/${tenantId}/booking/slots?date=${date}`;
        const res = await fetch(slotsUrl);
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
        setTimezone(visitorTimezone || json.data.timezone);

        // Update booking config from API on first load
        if (!configLoaded && json.data.weeklySchedule) {
          const newConfig: BookingConfig = {
            timezone: json.data.timezone,
            slotDurationMinutes: DEFAULT_BOOKING_CONFIG.slotDurationMinutes,
            lookaheadDays:
              json.data.lookaheadDays ?? DEFAULT_BOOKING_CONFIG.lookaheadDays,
            weeklySchedule: json.data.weeklySchedule,
          };
          setBookingConfig(newConfig);
          setConfigLoaded(true);
        }
      } catch {
        setError("Failed to load available times");
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    },
    [tenantId, visitorTimezone, productId, configLoaded],
  );

  // Auto-fetch slots when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSlots(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only trigger on open
  }, [isOpen]);

  // Re-select initial date when config loads from API
  useEffect(() => {
    if (configLoaded && step === "schedule") {
      const newInitial =
        findFirstBusinessDay(
          todayStr,
          bookingConfig.weeklySchedule,
          todayStr,
          maxDate,
        ) ?? todayStr;
      if (newInitial !== selectedDate) {
        setSelectedDate(newInitial);
        fetchSlots(newInitial);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when config first loads
  }, [configLoaded]);

  const handleDateChange = useCallback(
    (date: string) => {
      setSelectedDate(date);
      setSelectedSlot(null);
      fetchSlots(date);
    },
    [fetchSlots],
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
            productId: productId || undefined,
            _hp: data._hp,
            _t: data._t,
          }),
        });

        const json = (await res.json()) as {
          success: boolean;
          error?: string;
          warning?: string;
          data?: {
            requiresPayment?: boolean;
            clientSecret?: string;
            checkoutSessionId?: string;
            eventId?: string;
            date?: string;
          };
        };

        if (!json.success) {
          setError(json.error ?? "Booking failed");
          return;
        }

        // Show embedded Stripe Checkout for paid bookings
        if (json.data?.requiresPayment && json.data?.clientSecret) {
          setCheckoutClientSecret(json.data.clientSecret);
          if (
            json.data.eventId &&
            json.data.date &&
            json.data.checkoutSessionId
          ) {
            setPendingPaymentInfo({
              eventId: json.data.eventId,
              date: json.data.date,
              checkoutSessionId: json.data.checkoutSessionId,
            });
          }
          setStep("payment");
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
    [tenantId, selectedSlot, productId],
  );

  const cancelPendingPayment = useCallback(async () => {
    if (!pendingPaymentInfo) return;
    try {
      await fetch(`/api/data/tenants/${tenantId}/booking/cancel-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingPaymentInfo),
      });
    } catch (err) {
      console.warn("[DBG][BookingWidget] Failed to cancel payment:", err);
    }
    setPendingPaymentInfo(null);
    setCheckoutClientSecret(null);
  }, [tenantId, pendingPaymentInfo]);

  const handleClose = useCallback(() => {
    if (pendingPaymentInfo) {
      cancelPendingPayment();
    }
    onClose();
    setTimeout(resetState, 200);
  }, [onClose, resetState, pendingPaymentInfo, cancelPendingPayment]);

  const stepTitle = (() => {
    switch (step) {
      case "schedule":
        return productName || "Book an Appointment";
      case "form":
        return "Your Details";
      case "payment":
        return "Payment";
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

      {step === "schedule" && (
        <DayTimelineView
          bookingConfig={bookingConfig}
          slots={slots}
          loading={slotsLoading}
          selectedDate={selectedDate}
          timezone={timezone}
          tenantId={tenantId}
          onDateChange={handleDateChange}
          onSlotSelect={handleSlotSelect}
        />
      )}

      {step === "form" && (
        <div>
          <button
            type="button"
            onClick={() => setStep("schedule")}
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
            Back to schedule
          </button>

          {selectedSlot && (
            <div className="bg-indigo-50 rounded-lg p-3 mb-4 text-sm">
              <span className="font-medium text-indigo-900">
                {new Date(selectedDate + "T12:00:00Z").toLocaleDateString(
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

      {step === "payment" && checkoutClientSecret && (
        <StripeCheckoutView
          clientSecret={checkoutClientSecret}
          onBack={() => {
            cancelPendingPayment();
            setStep("form");
          }}
        />
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
