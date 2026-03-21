/**
 * POST /api/data/express-interest
 * Public endpoint — collect CallyGo "Express Interest" signups
 * Stores richer fields than the simple waitlist endpoint.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, Tables } from "@/lib/dynamodb";
import { EXPRESS_INTEREST_FORM_CONFIG } from "@/lib/expressInterestFormConfig";
import { isValidEmail } from "@core/lib/email/validator";

const WAITLIST_PK = "WAITLIST#CALLYGO";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { fields: Record<string, string> };
    const { fields } = body;

    if (!fields || typeof fields !== "object") {
      return NextResponse.json(
        { success: false, error: "Missing form fields" },
        { status: 400 },
      );
    }

    // Validate required fields against config
    for (const field of EXPRESS_INTEREST_FORM_CONFIG.fields) {
      const val = (fields[field.id] || "").trim();
      if (field.required && !val) {
        return NextResponse.json(
          { success: false, error: `${field.name} is required` },
          { status: 400 },
        );
      }
    }

    const email = (fields._email || fields.email || "").toLowerCase().trim();
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email is required" },
        { status: 400 },
      );
    }

    // Validate email (format, disposable domain, MX record)
    const emailValidation = await isValidEmail(email);
    if (!emailValidation.valid) {
      console.log(
        `[DBG][express-interest] Invalid email: ${email} — reason: ${emailValidation.reason}`,
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "That email address doesn't look right. Please check and try again.",
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    await docClient.send(
      new PutCommand({
        TableName: Tables.CORE,
        Item: {
          PK: WAITLIST_PK,
          SK: email,
          email,
          name: (fields._name || fields.name || "").trim() || undefined,
          mobile: (fields._mobile || fields.mobile || "").trim() || undefined,
          businessType: (fields.businessType || "").trim() || undefined,
          comments: (fields.comments || "").trim() || undefined,
          formFields: fields,
          signedUpAt: now,
          source: "express-interest",
        },
        // Overwrite if exists — update with richer data
      }),
    );

    console.log("[DBG][express-interest] New signup:", email);

    return NextResponse.json({
      success: true,
      data: { message: "Thanks for your interest! We'll be in touch soon." },
    });
  } catch (error) {
    console.error("[DBG][express-interest] Error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
