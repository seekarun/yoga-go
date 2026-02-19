/**
 * /api/data/app/inbox/signature
 * GET - Get signature config
 * PUT - Save signature config
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import type { EmailSignatureConfig } from "@/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const sig =
      ((tenant as unknown as Record<string, unknown>)
        .emailSignatureConfig as EmailSignatureConfig) || null;

    return NextResponse.json({
      success: true,
      data: sig || { text: "", html: "", enabled: false },
    });
  } catch (error) {
    console.error("[DBG][signature] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const body: EmailSignatureConfig = await request.json();

    // Validate
    if (typeof body.text !== "string" || typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Invalid signature config" },
        { status: 400 },
      );
    }

    // Store on tenant

    await updateTenant(tenant.id, {
      emailSignatureConfig: {
        text: body.text,
        html: body.html || body.text.replace(/\n/g, "<br>"),
        enabled: body.enabled,
      },
    } as any);

    console.log("[DBG][signature] Updated signature for tenant:", tenant.id);

    return NextResponse.json({
      success: true,
      data: {
        text: body.text,
        html: body.html || body.text.replace(/\n/g, "<br>"),
        enabled: body.enabled,
      },
    });
  } catch (error) {
    console.error("[DBG][signature] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
