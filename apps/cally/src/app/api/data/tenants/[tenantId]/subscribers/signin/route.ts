/**
 * POST /api/data/tenants/[tenantId]/subscribers/signin
 * Sign in existing user + subscribe to tenant
 * Does NOT set a session cookie — visitor doesn't need one
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  signIn,
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
  console.log(`[DBG][subscribers/signin] POST called for tenant ${tenantId}`);

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Authenticate with Cognito
    const authResult = await signIn({ email, password });
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.message },
        { status: 401 },
      );
    }

    console.log(`[DBG][subscribers/signin] Auth successful for ${email}`);

    // Decode ID token to get cognitoSub
    let cognitoSub: string | undefined;
    let name: string | undefined;
    let avatar: string | undefined;
    if (authResult.idToken) {
      const payload = JSON.parse(
        Buffer.from(authResult.idToken.split(".")[1], "base64").toString(),
      );
      cognitoSub = payload.sub;
      name = payload.name;
      avatar = payload.picture;
    }

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
    if (existing) {
      console.log(`[DBG][subscribers/signin] ${email} already subscribed`);
      return NextResponse.json({ success: true, alreadySubscribed: true });
    }

    // Create subscriber record
    await subscriberRepository.createSubscriber(tenantId, {
      email,
      name: name || email.split("@")[0],
      cognitoSub,
      avatar,
      subscribedAt: new Date().toISOString(),
      source: "direct",
    });
    console.log(`[DBG][subscribers/signin] Subscriber created for ${email}`);

    // Send welcome email (fire-and-forget)
    await sendWelcomeEmail({
      name: name || email.split("@")[0],
      email,
      tenant,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DBG][subscribers/signin] Error:", error);

    if (isCognitoError(error, "UserNotConfirmedException")) {
      return NextResponse.json(
        {
          success: false,
          code: "NOT_VERIFIED",
          error: getCognitoErrorMessage(error),
        },
        { status: 403 },
      );
    }

    if (
      isCognitoError(error, "NotAuthorizedException") ||
      isCognitoError(error, "UserNotFoundException")
    ) {
      return NextResponse.json(
        { success: false, error: getCognitoErrorMessage(error) },
        { status: 401 },
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
