/**
 * POST /api/data/tenants/[tenantId]/subscribers/signin
 * Sign in existing user + subscribe to tenant
 * Sets a session cookie so the visitor is authenticated on the landing page
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import {
  signIn,
  isCognitoError,
  getCognitoErrorMessage,
} from "@/lib/cognito-auth";
import { IS_PRODUCTION, COOKIE_DOMAIN } from "@/config/env";
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
    let alreadySubscribed = false;
    if (existing) {
      console.log(`[DBG][subscribers/signin] ${email} already subscribed`);
      alreadySubscribed = true;
    } else {
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
    }

    // Create session cookie so visitor is authenticated on the landing page
    const response = NextResponse.json({
      success: true,
      alreadySubscribed,
    });

    if (cognitoSub) {
      const sessionToken = await encode({
        token: {
          cognitoSub,
          sub: cognitoSub,
          email,
          name: name || email.split("@")[0],
          picture: avatar,
        },
        secret: process.env.NEXTAUTH_SECRET!,
        salt: "authjs.session-token",
      });

      const cookieOptions: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: "lax" | "strict" | "none";
        path: string;
        maxAge: number;
        domain?: string;
      } = {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      };

      if (COOKIE_DOMAIN) {
        cookieOptions.domain = COOKIE_DOMAIN;
      }

      response.cookies.set("authjs.session-token", sessionToken, cookieOptions);
      console.log(`[DBG][subscribers/signin] Session cookie set for ${email}`);
    }

    return response;
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
