/**
 * GET /api/data/app/users/[userEmail]
 * Returns user info + communication history for a specific user
 */

import { NextResponse } from "next/server";
import type {
  CallyUser,
  Email,
  CalendarEvent,
  ContactSubmission,
  FeedbackRequest,
  ApiResponse,
} from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import * as subscriberRepository from "@/lib/repositories/subscriberRepository";
import { getTenantCalendarEvents } from "@/lib/repositories/calendarEventRepository";
import { getContactsByTenant } from "@/lib/repositories/contactRepository";
import { getFeedbackByTenant } from "@/lib/repositories/feedbackRepository";
import { mergeSubscribersAndVisitors } from "@/lib/users/mergeUsers";
import { getEmailsByContact } from "@/lib/repositories/emailRepository";
import { parseVisitorFromDescription } from "@/lib/email/bookingNotification";

interface UserFileData {
  user: CallyUser;
  communications: Email[];
  bookings: CalendarEvent[];
  contacts: ContactSubmission[];
  feedbackRequests: FeedbackRequest[];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userEmail: string }> },
) {
  const { userEmail } = await params;
  const decodedEmail = decodeURIComponent(userEmail);

  console.log("[DBG][userFile] GET called for:", decodedEmail);

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<UserFileData>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<UserFileData>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Fetch users, communications, contacts, and feedback in parallel
    const [subscribers, events, communications, allContacts, allFeedback] =
      await Promise.all([
        subscriberRepository.getSubscribersByTenant(tenant.id),
        getTenantCalendarEvents(tenant.id),
        getEmailsByContact(tenant.id, decodedEmail),
        getContactsByTenant(tenant.id),
        getFeedbackByTenant(tenant.id),
      ]);

    const users = mergeSubscribersAndVisitors(subscribers, events, allContacts);
    const user = users.find(
      (u) => u.email.toLowerCase() === decodedEmail.toLowerCase(),
    );

    if (!user) {
      return NextResponse.json<ApiResponse<UserFileData>>(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Filter booking events for this user
    const normalizedEmail = decodedEmail.toLowerCase().trim();
    const bookings = events
      .filter((e) => {
        if (!e.title.startsWith("Booking:")) return false;
        const visitor = parseVisitorFromDescription(e.description);
        return visitor?.visitorEmail.toLowerCase().trim() === normalizedEmail;
      })
      .sort((a, b) => b.startTime.localeCompare(a.startTime));

    // Filter contacts for this user
    const contacts = allContacts.filter(
      (c) => c.email.toLowerCase().trim() === normalizedEmail,
    );

    // Filter feedback requests for this user
    const feedbackRequests = allFeedback.filter(
      (f) => f.recipientEmail.toLowerCase().trim() === normalizedEmail,
    );

    console.log(
      `[DBG][userFile] Returning user ${decodedEmail} with ${communications.length} communications, ${bookings.length} bookings, ${contacts.length} contacts, ${feedbackRequests.length} feedback requests`,
    );

    return NextResponse.json<ApiResponse<UserFileData>>({
      success: true,
      data: { user, communications, bookings, contacts, feedbackRequests },
    });
  } catch (error) {
    console.error("[DBG][userFile] Error:", error);
    return NextResponse.json<ApiResponse<UserFileData>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch user file",
      },
      { status: 500 },
    );
  }
}
