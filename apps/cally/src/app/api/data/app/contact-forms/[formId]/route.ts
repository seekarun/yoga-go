/**
 * PUT    /api/data/app/contact-forms/[formId] — update a contact form
 * DELETE /api/data/app/contact-forms/[formId] — delete a contact form
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ApiResponse, ContactFormConfig, ContactFormField } from "@/types";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";

interface RouteParams {
  params: Promise<{ formId: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { formId } = await params;
    console.log(`[DBG][contact-forms] PUT update form ${formId}`);

    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<ContactFormConfig>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<ContactFormConfig>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const existingForms = tenant.contactForms || [];
    const formIndex = existingForms.findIndex((f) => f.id === formId);
    if (formIndex === -1) {
      return NextResponse.json<ApiResponse<ContactFormConfig>>(
        { success: false, error: "Form not found" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as {
      name?: string;
      fields?: ContactFormField[];
    };

    const updatedForm: ContactFormConfig = {
      ...existingForms[formIndex],
      ...(body.name?.trim() && { name: body.name.trim() }),
      ...(body.fields && { fields: body.fields }),
      updatedAt: new Date().toISOString(),
    };

    const updatedForms = [...existingForms];
    updatedForms[formIndex] = updatedForm;

    await updateTenant(tenant.id, { contactForms: updatedForms });

    console.log(`[DBG][contact-forms] Updated form ${formId}`);

    return NextResponse.json<ApiResponse<ContactFormConfig>>({
      success: true,
      data: updatedForm,
    });
  } catch (error) {
    console.error("[DBG][contact-forms] PUT Error:", error);
    return NextResponse.json<ApiResponse<ContactFormConfig>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update form",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { formId } = await params;
    console.log(`[DBG][contact-forms] DELETE form ${formId}`);

    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const existingForms = tenant.contactForms || [];
    const filtered = existingForms.filter((f) => f.id !== formId);

    if (filtered.length === existingForms.length) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Form not found" },
        { status: 404 },
      );
    }

    await updateTenant(tenant.id, { contactForms: filtered });

    console.log(`[DBG][contact-forms] Deleted form ${formId}`);

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
    });
  } catch (error) {
    console.error("[DBG][contact-forms] DELETE Error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete form",
      },
      { status: 500 },
    );
  }
}
