/**
 * Webinar Waitlist API
 * POST /api/data/tenants/[tenantId]/webinar/[productId]/waitlist - Join the waitlist
 * GET  /api/data/tenants/[tenantId]/webinar/[productId]/waitlist?email=xxx - Check status
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getProductById } from "@/lib/repositories/productRepository";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import { countWebinarSignups } from "@/lib/repositories/webinarSignupRepository";
import {
  addToWebinarWaitlist,
  getWebinarWaitlistByEmail,
} from "@/lib/repositories/webinarWaitlistRepository";
import { sendWebinarWaitlistConfirmationEmail } from "@/lib/email/webinarWaitlistEmail";

interface RouteParams {
  params: Promise<{ tenantId: string; productId: string }>;
}

/**
 * POST - Join the waitlist for a webinar
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { tenantId, productId } = await params;

  console.log(
    "[DBG][webinar/waitlist] POST called for tenant:",
    tenantId,
    "product:",
    productId,
  );

  try {
    const body = await request.json();
    const { visitorName, visitorEmail } = body;

    // Validate required fields
    if (!visitorName || !visitorEmail) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Missing required fields: visitorName, visitorEmail",
        },
        { status: 400 },
      );
    }

    // Get product and verify it's a valid webinar
    const product = await getProductById(tenantId, productId);
    if (!product) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Product not found" },
        { status: 404 },
      );
    }

    if (product.productType !== "webinar") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Product is not a webinar" },
        { status: 400 },
      );
    }

    if (!product.isActive) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Webinar is not active" },
        { status: 400 },
      );
    }

    if (!product.maxParticipants) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Webinar has no participant limit — no waitlist is needed",
        },
        { status: 400 },
      );
    }

    // Verify webinar is actually full before allowing waitlist join
    const signupCount = await countWebinarSignups(tenantId, productId);
    if (signupCount < product.maxParticipants) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Webinar still has available spots — please sign up directly",
        },
        { status: 400 },
      );
    }

    // Get tenant
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Check for duplicate (same email + product)
    const existing = await getWebinarWaitlistByEmail(
      tenantId,
      productId,
      visitorEmail,
    );
    if (existing) {
      return NextResponse.json<
        ApiResponse<{ position: number; message: string }>
      >({
        success: true,
        data: {
          position: existing.position,
          message: `You're already on the waitlist at position #${existing.position}.`,
        },
      });
    }

    // Generate unique ID
    const entryId = `wwl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Add to waitlist
    const entry = await addToWebinarWaitlist(tenantId, {
      id: entryId,
      tenantId,
      productId,
      visitorName: visitorName.trim(),
      visitorEmail: visitorEmail.trim().toLowerCase(),
    });

    // Send confirmation email (fire-and-forget)
    sendWebinarWaitlistConfirmationEmail({
      visitorName: entry.visitorName,
      visitorEmail: entry.visitorEmail,
      webinarName: product.name,
      position: entry.position,
      tenant,
    }).catch((err) =>
      console.error(
        "[DBG][webinar/waitlist] Failed to send confirmation email:",
        err,
      ),
    );

    console.log(
      `[DBG][webinar/waitlist] Added ${visitorEmail} to webinar waitlist at position #${entry.position}`,
    );

    return NextResponse.json<
      ApiResponse<{ position: number; message: string }>
    >({
      success: true,
      data: {
        position: entry.position,
        message: `You're #${entry.position} on the waitlist! We'll email you if a spot opens up.`,
      },
    });
  } catch (error) {
    console.error("[DBG][webinar/waitlist] POST error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to join waitlist",
      },
      { status: 500 },
    );
  }
}

/**
 * GET - Check waitlist status for a webinar + email
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { tenantId, productId } = await params;
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  console.log(
    "[DBG][webinar/waitlist] GET called for tenant:",
    tenantId,
    "product:",
    productId,
    "email:",
    email,
  );

  if (!email) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Missing required param: email" },
      { status: 400 },
    );
  }

  try {
    const entry = await getWebinarWaitlistByEmail(tenantId, productId, email);

    if (!entry) {
      return NextResponse.json<ApiResponse<null>>({
        success: true,
        data: null,
      });
    }

    return NextResponse.json<ApiResponse<{ position: number; status: string }>>(
      {
        success: true,
        data: {
          position: entry.position,
          status: entry.status,
        },
      },
    );
  } catch (error) {
    console.error("[DBG][webinar/waitlist] GET error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check waitlist status",
      },
      { status: 500 },
    );
  }
}
