/**
 * Merge subscribers and calendar event visitors into a unified user list.
 * De-duplicates by email — if a visitor later signed up, they appear as "registered".
 */

import type { CalendarEvent } from "@core/types";
import type { TenantSubscriber, CallyUser, ContactSubmission } from "@/types";
import { parseVisitorFromDescription } from "@/lib/email/bookingNotification";

export function mergeSubscribersAndVisitors(
  subscribers: TenantSubscriber[],
  events: CalendarEvent[],
  contacts?: ContactSubmission[],
): CallyUser[] {
  const userMap = new Map<string, CallyUser>();

  // 1. Add all registered subscribers
  for (const sub of subscribers) {
    const key = sub.email.toLowerCase().trim();
    userMap.set(key, {
      email: sub.email,
      name: sub.name,
      userType: "registered",
      cognitoSub: sub.cognitoSub,
      avatar: sub.avatar,
      subscribedAt: sub.subscribedAt,
      source: sub.source,
      totalBookings: 0,
    });
  }

  // 2. Parse booking events and merge visitors
  const bookingEvents = events.filter((e) => e.title.startsWith("Booking:"));

  for (const event of bookingEvents) {
    const visitor = parseVisitorFromDescription(event.description);
    if (!visitor) continue;

    const key = visitor.visitorEmail.toLowerCase().trim();
    const existing = userMap.get(key);

    if (existing) {
      // Enrich existing user with booking data
      existing.totalBookings = (existing.totalBookings || 0) + 1;
      const eventDate = event.date || event.startTime;
      if (!existing.lastBookingDate || eventDate > existing.lastBookingDate) {
        existing.lastBookingDate = eventDate;
        existing.lastBookingStatus = event.status;
      }
    } else {
      // New visitor
      const eventDate = event.date || event.startTime;
      userMap.set(key, {
        email: visitor.visitorEmail,
        name: visitor.visitorName,
        userType: "visitor",
        lastBookingDate: eventDate,
        lastBookingStatus: event.status,
        totalBookings: 1,
      });
    }
  }

  // 3. Parse contacts and merge
  if (contacts) {
    for (const contact of contacts) {
      const key = contact.email.toLowerCase().trim();
      const existing = userMap.get(key);

      if (existing) {
        // Enrich existing user with contact data
        existing.totalContacts = (existing.totalContacts || 0) + 1;
        if (
          !existing.lastContactDate ||
          contact.submittedAt > existing.lastContactDate
        ) {
          existing.lastContactDate = contact.submittedAt;
        }
      } else {
        // New contact-only user
        userMap.set(key, {
          email: contact.email,
          name: contact.name,
          userType: "contact",
          lastContactDate: contact.submittedAt,
          totalContacts: 1,
        });
      }
    }
  }

  // 4. Sort by newest date first (subscribedAt, lastBookingDate, or lastContactDate)
  return Array.from(userMap.values()).sort((a, b) => {
    const dateA =
      a.subscribedAt || a.lastBookingDate || a.lastContactDate || "";
    const dateB =
      b.subscribedAt || b.lastBookingDate || b.lastContactDate || "";
    return dateB.localeCompare(dateA);
  });
}
