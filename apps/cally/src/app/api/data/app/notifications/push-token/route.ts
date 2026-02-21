/**
 * POST /api/data/app/notifications/push-token
 * Register an Expo push token for the authenticated tenant
 *
 * DELETE /api/data/app/notifications/push-token
 * Unregister a push token on logout
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { getMobileAuthResult } from "@/lib/mobile-auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { createHash } from "crypto";
import { docClient, Tables, TenantPK, EntityType } from "@/lib/dynamodb";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").substring(0, 16);
}

async function resolveAuth(
  request: NextRequest,
): Promise<{ cognitoSub?: string; error?: NextResponse }> {
  const mobileAuth = await getMobileAuthResult(request);

  if (mobileAuth.session) {
    return { cognitoSub: mobileAuth.session.cognitoSub };
  }
  if (mobileAuth.tokenExpired) {
    return {
      error: NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Token expired" },
        { status: 401 },
      ),
    };
  }

  const session = await auth();
  if (session?.user?.cognitoSub) {
    return { cognitoSub: session.user.cognitoSub };
  }

  return {
    error: NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    ),
  };
}

export async function POST(request: NextRequest) {
  console.log("[DBG][push-token] POST called");

  try {
    const { cognitoSub, error } = await resolveAuth(request);
    if (error) return error;

    const tenant = await getTenantByUserId(cognitoSub!);
    if (!tenant) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { token, platform } = body;

    if (!token || !platform) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "token and platform are required" },
        { status: 400 },
      );
    }

    const tokenHash = hashToken(token);

    await docClient.send(
      new PutCommand({
        TableName: Tables.CORE,
        Item: {
          PK: TenantPK.TENANT(tenant.id),
          SK: TenantPK.PUSH_TOKEN(tokenHash),
          EntityType: EntityType.PUSH_TOKEN,
          token,
          platform,
          tokenHash,
          createdAt: new Date().toISOString(),
        },
      }),
    );

    console.log(
      `[DBG][push-token] Registered push token for tenant ${tenant.id} (${platform})`,
    );

    return NextResponse.json<ApiResponse<{ registered: boolean }>>({
      success: true,
      data: { registered: true },
    });
  } catch (error) {
    console.error("[DBG][push-token] Error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to register push token",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  console.log("[DBG][push-token] DELETE called");

  try {
    const { cognitoSub, error } = await resolveAuth(request);
    if (error) return error;

    const tenant = await getTenantByUserId(cognitoSub!);
    if (!tenant) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "token is required" },
        { status: 400 },
      );
    }

    const tokenHash = hashToken(token);

    await docClient.send(
      new DeleteCommand({
        TableName: Tables.CORE,
        Key: {
          PK: TenantPK.TENANT(tenant.id),
          SK: TenantPK.PUSH_TOKEN(tokenHash),
        },
      }),
    );

    console.log(
      `[DBG][push-token] Unregistered push token for tenant ${tenant.id}`,
    );

    return NextResponse.json<ApiResponse<{ unregistered: boolean }>>({
      success: true,
      data: { unregistered: true },
    });
  } catch (error) {
    console.error("[DBG][push-token] Error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to unregister push token",
      },
      { status: 500 },
    );
  }
}
