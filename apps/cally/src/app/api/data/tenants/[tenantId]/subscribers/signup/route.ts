/**
 * POST /api/data/tenants/[tenantId]/subscribers/signup
 * Register a new visitor with Cognito (does NOT create a tenant)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  signUp,
  isCognitoError,
  getCognitoErrorMessage,
} from "@/lib/cognito-auth";

interface RouteParams {
  params: Promise<{
    tenantId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { tenantId } = await params;
  console.log(`[DBG][subscribers/signup] POST called for tenant ${tenantId}`);

  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required" },
        { status: 400 },
      );
    }

    // Create Cognito user
    const result = await signUp({ email, password, name });

    console.log(
      `[DBG][subscribers/signup] Cognito signup result for ${email}:`,
      {
        success: result.success,
        requiresVerification: result.requiresVerification,
      },
    );

    return NextResponse.json({
      success: true,
      requiresVerification: result.requiresVerification,
    });
  } catch (error) {
    console.error("[DBG][subscribers/signup] Error:", error);

    if (isCognitoError(error, "UsernameExistsException")) {
      return NextResponse.json(
        {
          success: false,
          code: "USER_EXISTS",
          error: getCognitoErrorMessage(error),
        },
        { status: 409 },
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
