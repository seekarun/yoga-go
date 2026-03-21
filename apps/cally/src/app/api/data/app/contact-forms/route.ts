/**
 * GET  /api/data/app/contact-forms — list all contact forms for the tenant
 * POST /api/data/app/contact-forms — create a new contact form
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ApiResponse, ContactFormConfig, ContactFormField } from "@/types";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";

export async function GET() {
  console.log("[DBG][contact-forms] GET list called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<ContactFormConfig[]>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<ContactFormConfig[]>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const forms = tenant.contactForms || [];
    console.log(`[DBG][contact-forms] Returning ${forms.length} forms`);

    return NextResponse.json<ApiResponse<ContactFormConfig[]>>({
      success: true,
      data: forms,
    });
  } catch (error) {
    console.error("[DBG][contact-forms] GET Error:", error);
    return NextResponse.json<ApiResponse<ContactFormConfig[]>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch forms",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  console.log("[DBG][contact-forms] POST create called");

  try {
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

    const body = (await request.json()) as {
      name: string;
      fields: ContactFormField[];
    };

    if (!body.name?.trim()) {
      return NextResponse.json<ApiResponse<ContactFormConfig>>(
        { success: false, error: "Form name is required" },
        { status: 400 },
      );
    }

    if (!body.fields?.length) {
      return NextResponse.json<ApiResponse<ContactFormConfig>>(
        { success: false, error: "At least one field is required" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const formId = `form-${Math.random().toString(36).substring(2, 10)}`;

    const newForm: ContactFormConfig = {
      id: formId,
      name: body.name.trim(),
      fields: body.fields,
      createdAt: now,
      updatedAt: now,
    };

    const existingForms = tenant.contactForms || [];
    await updateTenant(tenant.id, {
      contactForms: [...existingForms, newForm],
    });

    console.log(`[DBG][contact-forms] Created form ${formId}`);

    return NextResponse.json<ApiResponse<ContactFormConfig>>({
      success: true,
      data: newForm,
    });
  } catch (error) {
    console.error("[DBG][contact-forms] POST Error:", error);
    return NextResponse.json<ApiResponse<ContactFormConfig>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create form",
      },
      { status: 500 },
    );
  }
}
