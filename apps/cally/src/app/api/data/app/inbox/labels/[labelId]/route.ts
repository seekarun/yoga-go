/**
 * PATCH /api/data/app/inbox/labels/[labelId] - Update a label
 * DELETE /api/data/app/inbox/labels/[labelId] - Delete a label
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  updateLabel,
  deleteLabel,
} from "@/lib/repositories/emailLabelRepository";

interface RouteParams {
  params: Promise<{ labelId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { labelId } = await params;
    const body = await request.json();
    const { name, color } = body;

    const updated = await updateLabel(tenant.id, labelId, { name, color });
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Label not found" },
        { status: 404 },
      );
    }

    console.log("[DBG][inbox/labels] Updated label:", labelId);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[DBG][inbox/labels] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

    const { labelId } = await params;
    await deleteLabel(tenant.id, labelId);

    console.log("[DBG][inbox/labels] Deleted label:", labelId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DBG][inbox/labels] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
