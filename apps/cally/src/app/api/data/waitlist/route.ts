/**
 * POST /api/data/waitlist
 * Public endpoint - collect CallyGo waitlist signups
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, Tables } from "@/lib/dynamodb";

const WAITLIST_PK = "WAITLIST#CALLYGO";

interface WaitlistInput {
  email: string;
  name?: string;
  business?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WaitlistInput;

    if (!body.email || !body.email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email is required" },
        { status: 400 },
      );
    }

    const normalizedEmail = body.email.toLowerCase().trim();
    const now = new Date().toISOString();

    await docClient.send(
      new PutCommand({
        TableName: Tables.CORE,
        Item: {
          PK: WAITLIST_PK,
          SK: normalizedEmail,
          email: normalizedEmail,
          name: body.name || undefined,
          business: body.business || undefined,
          signedUpAt: now,
          source: "landing-page",
        },
        // Don't overwrite if already exists — idempotent
        ConditionExpression: "attribute_not_exists(SK)",
      }),
    );

    console.log("[DBG][waitlist] New signup:", normalizedEmail);

    return NextResponse.json({
      success: true,
      data: { message: "You're on the list!" },
    });
  } catch (error: unknown) {
    // ConditionalCheckFailedException means already signed up — treat as success
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      return NextResponse.json({
        success: true,
        data: { message: "You're already on the list!" },
      });
    }

    console.error("[DBG][waitlist] Error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
