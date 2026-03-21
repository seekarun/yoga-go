/**
 * POST /api/data/tenants/[tenantId]/contact/[formId]
 * Public endpoint to submit a configurable contact form
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import { createContact } from "@/lib/repositories/contactRepository";
import { sendContactNotificationEmail } from "@/lib/email/contactNotification";
import { isValidEmail } from "@core/lib/email/validator";
import { extractVisitorInfo, checkSpamProtection } from "@core/lib";
import { Tables } from "@/lib/dynamodb";

interface RouteParams {
  params: Promise<{
    tenantId: string;
    formId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId, formId } = await params;
    const body = await request.json();

    console.log(
      `[DBG][contact-form] Submission for tenant ${tenantId}, form ${formId}`,
    );

    // Spam protection
    const spamCheck = await checkSpamProtection(request.headers, body, {
      tableName: Tables.CORE,
    });
    if (!spamCheck.passed) {
      console.log(
        `[DBG][contact-form] Spam blocked for tenant ${tenantId}: ${spamCheck.reason}`,
      );
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const visitorInfo = extractVisitorInfo(request.headers);
    const { fields } = body as { fields: Record<string, string> };

    if (!fields || typeof fields !== "object") {
      return NextResponse.json(
        { success: false, error: "Missing form fields" },
        { status: 400 },
      );
    }

    // Verify tenant exists and find form config
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const formConfig = (tenant.contactForms || []).find((f) => f.id === formId);
    if (!formConfig) {
      return NextResponse.json(
        { success: false, error: "Form not found" },
        { status: 404 },
      );
    }

    // Validate required fields against config
    for (const field of formConfig.fields) {
      const val = (fields[field.id] || "").trim();
      if (field.required && !val) {
        return NextResponse.json(
          { success: false, error: `${field.name} is required` },
          { status: 400 },
        );
      }
    }

    // Extract name and email — check standard IDs first, then fall back to type detection
    const emailField =
      formConfig.fields.find((f) => f.id === "_email") ||
      formConfig.fields.find((f) => f.type === "email");
    const nameField =
      formConfig.fields.find((f) => f.id === "_name") ||
      formConfig.fields.find(
        (f) => f.type === "text" && f.name.toLowerCase().includes("name"),
      );

    const email = emailField
      ? (fields[emailField.id] || "").toLowerCase().trim()
      : "";
    const name = nameField ? (fields[nameField.id] || "").trim() : "Anonymous";

    // Build a message summary from all fields
    const messageParts = formConfig.fields
      .filter((f) => fields[f.id]?.trim())
      .map((f) => `${f.name}: ${fields[f.id].trim()}`);
    const message = messageParts.join("\n");

    // Validate email if present
    let flaggedAsSpam = false;
    let emailValidationReason: string | undefined;

    if (email) {
      const emailValidation = await isValidEmail(email);
      if (!emailValidation.valid) {
        console.log(
          `[DBG][contact-form] Invalid email: ${email} — reason: ${emailValidation.reason}`,
        );
        flaggedAsSpam = true;
        emailValidationReason = emailValidation.reason;
      }
    }

    // Create contact submission
    const contact = await createContact(tenantId, {
      name,
      email: email || "no-email@unknown.com",
      message,
      flaggedAsSpam: flaggedAsSpam || undefined,
      emailValidationReason,
      visitorInfo,
      formId,
      formFields: fields,
    });

    if (flaggedAsSpam) {
      console.log(
        `[DBG][contact-form] Spam-flagged contact ${contact.id} created`,
      );
      return NextResponse.json(
        {
          success: true,
          warning:
            "Your email address appears invalid. Your message was received, but please check your email.",
          data: { contactId: contact.id },
        },
        { status: 202 },
      );
    }

    // Send notification email to tenant
    sendContactNotificationEmail({
      visitorName: name,
      visitorEmail: email,
      message,
      tenant,
    });

    console.log(
      `[DBG][contact-form] Contact ${contact.id} created for tenant ${tenantId}`,
    );

    return NextResponse.json({
      success: true,
      data: { contactId: contact.id },
    });
  } catch (error) {
    console.error("[DBG][contact-form] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit form",
      },
      { status: 500 },
    );
  }
}
