/**
 * RSVP Token Utility
 * HMAC-SHA256 based tokens for event RSVP links in invite emails.
 * Token format: base64url(JSON payload).signature
 */
import { createHmac } from "crypto";
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import type { RsvpStatus } from "@/types";

export interface RsvpTokenPayload {
  tenantId: string;
  eventId: string;
  email: string;
  response: RsvpStatus;
}

function getSecret(): string {
  // Reuse the same secret as cancel tokens – both are self-service links
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
 * Generate an RSVP token
 */
export function generateRsvpToken(payload: RsvpTokenPayload): string {
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

/**
 * Verify and decode an RSVP token
 * Returns the payload if valid, null if tampered or invalid
 */
export function verifyRsvpToken(token: string): RsvpTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [encoded, signature] = parts;
    const expectedSig = sign(encoded);

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(fromBase64Url(encoded)) as RsvpTokenPayload;
    if (
      !payload.tenantId ||
      !payload.eventId ||
      !payload.email ||
      !payload.response
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Build RSVP URLs for an attendee
 */
export function buildRsvpUrls(
  tenant: CallyTenant,
  eventId: string,
  attendeeEmail: string,
): { acceptUrl: string; declineUrl: string } {
  // Use the app base URL (not the tenant landing page URL) since the RSVP
  // route is an API endpoint on the cally app itself.
  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://proj-cally.vercel.app";
  const apiPath = `/api/data/tenants/${tenant.id}/calendar/events/${eventId}/rsvp`;

  const acceptToken = generateRsvpToken({
    tenantId: tenant.id,
    eventId,
    email: attendeeEmail,
    response: "accepted",
  });

  const declineToken = generateRsvpToken({
    tenantId: tenant.id,
    eventId,
    email: attendeeEmail,
    response: "declined",
  });

  return {
    acceptUrl: `${appBaseUrl}${apiPath}?token=${encodeURIComponent(acceptToken)}`,
    declineUrl: `${appBaseUrl}${apiPath}?token=${encodeURIComponent(declineToken)}`,
  };
}
