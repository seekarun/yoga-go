/**
 * POST /api/data/tenants/[tenantId]/subscribers/verify
 * Verify email + create subscriber record
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  confirmSignUp,
  isCognitoError,
  getCognitoErrorMessage,
} from "@/lib/cognito-auth";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import * as subscriberRepository from "@/lib/repositories/subscriberRepository";
import { sendWelcomeEmail } from "@/lib/email/welcomeEmail";

interface RouteParams {
  params: Promise<{
    tenantId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { tenantId } = await params;
  console.log(`[DBG][subscribers/verify] POST called for tenant ${tenantId}`);

  try {
    const body = await request.json();
    const { email, code, name } = body;

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: "Email and verification code are required" },
        { status: 400 },
      );
    }

    // Verify with Cognito
    await confirmSignUp({ email, code });
    console.log(`[DBG][subscribers/verify] Email verified for ${email}`);

    // Validate tenant exists
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Check if already subscribed
    const existing = await subscriberRepository.getSubscriber(tenantId, email);
    if (!existing) {
      // Create subscriber record
      await subscriberRepository.createSubscriber(tenantId, {
        email,
        name: name || email.split("@")[0],
        subscribedAt: new Date().toISOString(),
        source: "direct",
      });
      console.log(`[DBG][subscribers/verify] Subscriber created for ${email}`);

      // Send welcome email (fire-and-forget)
      await sendWelcomeEmail({
        name: name || email.split("@")[0],
        email,
        tenant,
      });
    } else {
      console.log(`[DBG][subscribers/verify] ${email} already subscribed`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DBG][subscribers/verify] Error:", error);

    if (
      isCognitoError(error, "CodeMismatchException") ||
      isCognitoError(error, "ExpiredCodeException")
    ) {
      return NextResponse.json(
        { success: false, error: getCognitoErrorMessage(error) },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: getCognitoErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
