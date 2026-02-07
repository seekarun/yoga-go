/**
 * POST /api/data/tenants/[tenantId]/contact
 * Public endpoint to submit a contact form message
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import { createContact } from "@/lib/repositories/contactRepository";
import { sendContactNotificationEmail } from "@/lib/email/contactNotification";

interface RouteParams {
  params: Promise<{
    tenantId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    console.log(
      "[DBG][contact] Creating contact submission for tenant:",
      tenantId,
    );

    const { name, email, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, email, message",
        },
        { status: 400 },
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
        { status: 400 },
      );
    }

    // Verify tenant exists
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Create contact submission
    const contact = await createContact(tenantId, {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      message: message.trim(),
    });

    // Send notification email to tenant (fire-and-forget)
    sendContactNotificationEmail({
      visitorName: name.trim(),
      visitorEmail: email.toLowerCase().trim(),
      message: message.trim(),
      tenant,
    });

    console.log(
      `[DBG][contact] Contact submission ${contact.id} created for tenant ${tenantId}`,
    );

    return NextResponse.json({
      success: true,
      data: { contactId: contact.id },
    });
  } catch (error) {
    console.error("[DBG][contact] Error creating contact:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit contact form",
      },
      { status: 500 },
    );
  }
}
