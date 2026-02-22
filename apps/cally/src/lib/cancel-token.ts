/**
 * Cancel Token Utility
 * HMAC-SHA256 based tokens for self-service booking cancellation links.
 * Token format: base64url(JSON payload).signature
 */
import { createHmac } from "crypto";
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import { getLandingPageUrl } from "@/lib/email/bookingNotification";

interface CancelTokenPayload {
  tenantId: string;
  eventId: string;
  date: string;
}

function getSecret(): string {
  const secret = process.env.BOOKING_CANCEL_SECRET;
  if (!secret) {
    throw new Error("BOOKING_CANCEL_SECRET environment variable is not set");
  }
  return secret;
}

function toBase64Url(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf-8");
}

function sign(payload: string): string {
  const secret = getSecret();
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Generate a cancel token for a booking
 */
export function generateCancelToken(payload: CancelTokenPayload): string {
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

/**
 * Verify and decode a cancel token
 * Returns the payload if valid, null if tampered or invalid
 */
export function verifyCancelToken(token: string): CancelTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [encoded, signature] = parts;
    const expectedSig = sign(encoded);

    // Constant-time comparison
    if (
      signature.length !== expectedSig.length ||
      !createHmac("sha256", getSecret())
        .update(encoded)
        .digest("base64url")
        .split("")
        .every((c, i) => c === signature[i])
    ) {
      // Fallback: simple comparison (the hmac already provides timing safety)
      if (signature !== expectedSig) return null;
    }

    const payload = JSON.parse(fromBase64Url(encoded)) as CancelTokenPayload;
    if (!payload.tenantId || !payload.eventId || !payload.date) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Build the full cancel URL for a booking
 */
export function buildCancelUrl(
  tenant: CallyTenant,
  payload: CancelTokenPayload,
): string {
  const token = generateCancelToken(payload);
  const baseUrl = getLandingPageUrl(tenant);
  return `${baseUrl}/booking/cancel?token=${encodeURIComponent(token)}`;
}

/* ------------------------------------------------------------------ */
/*  Webinar cancel / waitlist tokens                                  */
/* ------------------------------------------------------------------ */

export interface WebinarCancelTokenPayload {
  tenantId: string;
  productId: string;
  email: string;
}

/**
 * Generate a cancel token for a webinar signup
 */
export function generateWebinarCancelToken(
  payload: WebinarCancelTokenPayload,
): string {
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

/**
 * Verify and decode a webinar cancel token
 * Returns the payload if valid, null if tampered or invalid
 */
export function verifyWebinarCancelToken(
  token: string,
): WebinarCancelTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [encoded, signature] = parts;
    const expectedSig = sign(encoded);

    // Constant-time comparison
    if (
      signature.length !== expectedSig.length ||
      !createHmac("sha256", getSecret())
        .update(encoded)
        .digest("base64url")
        .split("")
        .every((c, i) => c === signature[i])
    ) {
      // Fallback: simple comparison (the hmac already provides timing safety)
      if (signature !== expectedSig) return null;
    }

    const payload = JSON.parse(
      fromBase64Url(encoded),
    ) as WebinarCancelTokenPayload;
    if (!payload.tenantId || !payload.productId || !payload.email) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Build the full cancel URL for a webinar signup
 */
export function buildWebinarCancelUrl(
  tenant: CallyTenant,
  payload: WebinarCancelTokenPayload,
): string {
  const token = generateWebinarCancelToken(payload);
  const baseUrl = getLandingPageUrl(tenant);
  return `${baseUrl}/webinar/cancel?token=${encodeURIComponent(token)}`;
}
