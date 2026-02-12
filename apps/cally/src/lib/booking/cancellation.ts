/**
 * Cancellation Business Logic
 * Handles refund calculations based on cancellation policy
 */
import type { CancellationConfig } from "@/types/booking";
import { DEFAULT_CANCELLATION_CONFIG } from "@/types/booking";

/**
 * Check if the current time is before the cancellation deadline
 */
export function isBeforeDeadline(
  eventStartTime: string,
  config?: CancellationConfig,
): boolean {
  const { cancellationDeadlineHours } = config ?? DEFAULT_CANCELLATION_CONFIG;
  const eventStart = new Date(eventStartTime).getTime();
  const now = Date.now();
  const deadlineMs = cancellationDeadlineHours * 60 * 60 * 1000;
  return eventStart - now >= deadlineMs;
}

interface RefundResult {
  amountCents: number;
  isFullRefund: boolean;
  reason: string;
}

/**
 * Calculate the refund amount for a visitor cancellation
 */
export function calculateVisitorRefundAmount(
  paidAmountCents: number,
  eventStartTime: string,
  config?: CancellationConfig,
): RefundResult {
  const effectiveConfig = config ?? DEFAULT_CANCELLATION_CONFIG;

  if (isBeforeDeadline(eventStartTime, effectiveConfig)) {
    return {
      amountCents: paidAmountCents,
      isFullRefund: true,
      reason: `Cancelled before ${effectiveConfig.cancellationDeadlineHours}h deadline — full refund`,
    };
  }

  const refundPercent = effectiveConfig.lateCancellationRefundPercent;
  if (refundPercent === 0) {
    return {
      amountCents: 0,
      isFullRefund: false,
      reason: `Cancelled after ${effectiveConfig.cancellationDeadlineHours}h deadline — no refund`,
    };
  }

  const amountCents = Math.round((paidAmountCents * refundPercent) / 100);
  return {
    amountCents,
    isFullRefund: amountCents === paidAmountCents,
    reason: `Cancelled after ${effectiveConfig.cancellationDeadlineHours}h deadline — ${refundPercent}% refund`,
  };
}

/**
 * Calculate the refund amount for a tenant cancellation (always full)
 */
export function calculateTenantRefundAmount(
  paidAmountCents: number,
): RefundResult {
  return {
    amountCents: paidAmountCents,
    isFullRefund: true,
    reason: "Cancelled by host — full refund",
  };
}
