/**
 * Google OAuth Callback Handler
 * Handles the callback from Cognito after Google authentication
 * Exchanges the authorization code for tokens and creates the session
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { nanoid } from "nanoid";
import { cognitoConfig } from "@/lib/cognito";
import { BASE_URL, COOKIE_DOMAIN, IS_PRODUCTION } from "@/config/env";
import {
  getTenantByUserId,
  getTenantById,
  createTenant,
} from "@/lib/repositories/tenantRepository";
import * as subscriberRepository from "@/lib/repositories/subscriberRepository";
import { sendWelcomeEmail } from "@/lib/email/welcomeEmail";

export async function GET(request: NextRequest) {
  console.log("[DBG][auth/google/callback] Processing Google OAuth callback");

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Parse state — new format is base64-encoded JSON, old format is plain string
  let callbackUrl = "/srv";
  let visitorTenantId: string | undefined;
  if (state) {
    try {
      const stateObj = JSON.parse(Buffer.from(state, "base64").toString());
      callbackUrl = stateObj.callbackUrl || "/srv";
      visitorTenantId = stateObj.visitorTenantId;
    } catch {
      // Backward compat: plain string state
      callbackUrl = state;
    }
  }

  console.log("[DBG][auth/google/callback] State parsed:", {
    callbackUrl,
    visitorTenantId,
  });

  // Handle errors from Cognito
  if (error) {
    console.error(
      "[DBG][auth/google/callback] OAuth error:",
      error,
      errorDescription,
    );
    return NextResponse.redirect(
      new URL(
        `/auth/signin?error=${encodeURIComponent(errorDescription || error)}`,
        BASE_URL,
      ),
    );
  }

  if (!code) {
    console.error("[DBG][auth/google/callback] No authorization code received");
    return NextResponse.redirect(
      new URL("/auth/signin?error=No authorization code", BASE_URL),
    );
  }

  try {
    // Exchange authorization code for tokens
    const domain = cognitoConfig.domain;
    const tokenUrl = `https://${domain}/oauth2/token`;
    const redirectUri = `${BASE_URL}/api/auth/google/callback`;

    console.log("[DBG][auth/google/callback] Exchanging code for tokens");

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: cognitoConfig.clientId,
        client_secret: cognitoConfig.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(
        "[DBG][auth/google/callback] Token exchange failed:",
        errorText,
      );
      return NextResponse.redirect(
        new URL("/auth/signin?error=Authentication failed", BASE_URL),
      );
    }

    const tokens = await tokenResponse.json();
    console.log("[DBG][auth/google/callback] Tokens received");

    // Decode the ID token to get user info (it's a JWT)
    const idToken = tokens.id_token;
    const payload = JSON.parse(
      Buffer.from(idToken.split(".")[1], "base64").toString(),
    );

    console.log("[DBG][auth/google/callback] User info from token:", {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
    });

    // ===== Visitor mode: subscribe to tenant, no session =====
    if (visitorTenantId) {
      console.log(
        "[DBG][auth/google/callback] Visitor mode for tenant:",
        visitorTenantId,
      );

      const visitorTenant = await getTenantById(visitorTenantId);
      if (visitorTenant) {
        // Check if already subscribed
        const existing = await subscriberRepository.getSubscriber(
          visitorTenantId,
          payload.email,
        );
        if (!existing) {
          await subscriberRepository.createSubscriber(visitorTenantId, {
            email: payload.email || "",
            name: payload.name || payload.email?.split("@")[0] || "User",
            cognitoSub: payload.sub,
            avatar: payload.picture,
            subscribedAt: new Date().toISOString(),
            source: "google",
          });
          console.log("[DBG][auth/google/callback] Visitor subscriber created");

          // Send welcome email (fire-and-forget)
          await sendWelcomeEmail({
            name: payload.name || payload.email?.split("@")[0] || "User",
            email: payload.email || "",
            tenant: visitorTenant,
          });
        } else {
          console.log("[DBG][auth/google/callback] Visitor already subscribed");
        }
      }

      // Redirect to callback URL without setting session
      const finalRedirectUrl = new URL(callbackUrl, BASE_URL);
      console.log(
        "[DBG][auth/google/callback] Visitor redirect to:",
        finalRedirectUrl.toString(),
      );
      return NextResponse.redirect(finalRedirectUrl.toString());
    }

    // ===== Creator mode: create tenant + set session =====
    let tenant = await getTenantByUserId(payload.sub);
    if (!tenant) {
      console.log(
        "[DBG][auth/google/callback] No tenant found, creating new tenant",
      );
      const tenantId = nanoid(12);
      tenant = await createTenant({
        id: tenantId,
        userId: payload.sub,
        name: payload.name || payload.email?.split("@")[0] || "User",
        email: payload.email || "",
        avatar: payload.picture,
      });
      console.log("[DBG][auth/google/callback] Created tenant:", tenant.id);
    } else {
      console.log(
        "[DBG][auth/google/callback] Found existing tenant:",
        tenant.id,
      );
    }

    // Create session token using NextAuth's encode function
    const sessionToken = await encode({
      token: {
        cognitoSub: payload.sub,
        sub: payload.sub,
        email: payload.email,
        name: payload.name || payload.email?.split("@")[0],
        picture: payload.picture,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      salt: "authjs.session-token",
    });

    // Build final redirect URL
    const finalRedirectUrl = new URL(callbackUrl, BASE_URL);

    console.log(
      "[DBG][auth/google/callback] Creating session and redirecting to:",
      finalRedirectUrl.toString(),
    );

    // Create response with redirect
    const response = NextResponse.redirect(finalRedirectUrl.toString());

    // Set session cookie with the name NextAuth expects
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

    // Set domain for production to work across subdomains
    if (COOKIE_DOMAIN) {
      cookieOptions.domain = COOKIE_DOMAIN;
    }

    response.cookies.set("authjs.session-token", sessionToken, cookieOptions);
    console.log(
      "[DBG][auth/google/callback] Cookie set with options:",
      cookieOptions,
    );

    return response;
  } catch (err) {
    console.error("[DBG][auth/google/callback] Error:", err);
    return NextResponse.redirect(
      new URL("/auth/signin?error=Authentication failed", BASE_URL),
    );
  }
}
