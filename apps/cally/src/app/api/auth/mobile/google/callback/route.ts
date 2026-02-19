/**
 * Mobile Google OAuth Callback
 * Exchanges Cognito auth code for tokens and returns JSON for mobile consumption
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { cognitoConfig } from "@/lib/cognito";
import {
  getTenantByUserId,
  createTenant,
} from "@/lib/repositories/tenantRepository";

export async function POST(request: NextRequest) {
  console.log(
    "[DBG][auth/mobile/google/callback] Processing mobile Google callback",
  );

  try {
    const body = await request.json();
    const { code, redirectUri } = body;

    if (!code || !redirectUri) {
      return NextResponse.json(
        { success: false, message: "Missing code or redirectUri" },
        { status: 400 },
      );
    }

    // Exchange authorization code for tokens at Cognito
    const domain = cognitoConfig.domain;
    const tokenUrl = `https://${domain}/oauth2/token`;

    console.log(
      "[DBG][auth/mobile/google/callback] Exchanging code for tokens",
    );

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
        "[DBG][auth/mobile/google/callback] Token exchange failed:",
        errorText,
      );
      return NextResponse.json(
        { success: false, message: "Token exchange failed" },
        { status: 401 },
      );
    }

    const tokens = await tokenResponse.json();
    console.log("[DBG][auth/mobile/google/callback] Tokens received");

    // Decode the ID token to get user info (JWT)
    const idToken = tokens.id_token;
    const payload = JSON.parse(
      Buffer.from(idToken.split(".")[1], "base64").toString(),
    );

    console.log("[DBG][auth/mobile/google/callback] User info from token:", {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
    });

    // Find or create tenant
    let tenant = await getTenantByUserId(payload.sub);
    if (!tenant) {
      console.log(
        "[DBG][auth/mobile/google/callback] No tenant found, creating new tenant",
      );
      const tenantId = nanoid(12);
      tenant = await createTenant({
        id: tenantId,
        userId: payload.sub,
        name: payload.name || payload.email?.split("@")[0] || "User",
        email: payload.email || "",
        avatar: payload.picture,
      });
      console.log(
        "[DBG][auth/mobile/google/callback] Created tenant:",
        tenant.id,
      );
    } else {
      console.log(
        "[DBG][auth/mobile/google/callback] Found existing tenant:",
        tenant.id,
      );
    }

    return NextResponse.json({
      success: true,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      user: {
        id: tenant.id,
        cognitoSub: payload.sub,
        email: payload.email || "",
        name: payload.name || payload.email?.split("@")[0] || "User",
        tenantId: tenant.id,
      },
    });
  } catch (err) {
    console.error("[DBG][auth/mobile/google/callback] Error:", err);
    return NextResponse.json(
      { success: false, message: "Authentication failed" },
      { status: 500 },
    );
  }
}
