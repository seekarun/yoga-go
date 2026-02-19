/**
 * GET /api/data/app/inbox/labels - List all labels
 * POST /api/data/app/inbox/labels - Create a new label
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getLabelsByTenant,
  createLabel,
} from "@/lib/repositories/emailLabelRepository";

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

    const labels = await getLabelsByTenant(tenant.id);

    console.log(
      "[DBG][inbox/labels] Found",
      labels.length,
      "labels for tenant:",
      tenant.id,
    );

    return NextResponse.json({ success: true, data: labels });
  } catch (error) {
    console.error("[DBG][inbox/labels] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, color } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Label name is required" },
        { status: 400 },
      );
    }

    if (!color || typeof color !== "string") {
      return NextResponse.json(
        { success: false, error: "Label color is required" },
        { status: 400 },
      );
    }

    const label = await createLabel(tenant.id, name.trim(), color);

    console.log("[DBG][inbox/labels] Created label:", label.id);

    return NextResponse.json({ success: true, data: label }, { status: 201 });
  } catch (error) {
    console.error("[DBG][inbox/labels] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
