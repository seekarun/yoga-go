/**
 * Product API Routes (Authenticated)
 * GET  /api/data/app/products - List all products for the tenant
 * POST /api/data/app/products - Create a new product
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ApiResponse, Product, WebinarSchedule } from "@/types";
import { auth } from "@/auth";
import { getMobileAuthResult } from "@/lib/mobile-auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getProductsByTenant,
  createProduct,
} from "@/lib/repositories/productRepository";
import type { CreateProductInput } from "@/lib/repositories/productRepository";
import { createCalendarEvent } from "@/lib/repositories/calendarEventRepository";
import { expandWebinarSessions } from "@/lib/webinar/schedule";

const MIN_DURATION = 5;
const MAX_DURATION = 480;

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<Product[]>>> {
  console.log("[DBG][products] GET called");

  try {
    const mobileAuth = await getMobileAuthResult(request);
    let cognitoSub: string | undefined;
    if (mobileAuth.session) {
      cognitoSub = mobileAuth.session.cognitoSub;
    } else if (mobileAuth.tokenExpired) {
      return NextResponse.json(
        { success: false, error: "Token expired" },
        { status: 401 },
      );
    } else {
      const session = await auth();
      cognitoSub = session?.user?.cognitoSub;
    }
    if (!cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const products = await getProductsByTenant(tenant.id);

    console.log(
      `[DBG][products] Returning ${products.length} products for tenant ${tenant.id}`,
    );

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("[DBG][products] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<Product>>> {
  console.log("[DBG][products] POST called");

  try {
    const mobileAuth = await getMobileAuthResult(request);
    let cognitoSub: string | undefined;
    if (mobileAuth.session) {
      cognitoSub = mobileAuth.session.cognitoSub;
    } else if (mobileAuth.tokenExpired) {
      return NextResponse.json(
        { success: false, error: "Token expired" },
        { status: 401 },
      );
    } else {
      const session = await auth();
      cognitoSub = session?.user?.cognitoSub;
    }
    if (!cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      durationMinutes,
      price,
      color,
      image,
      imagePosition,
      imageZoom,
      images,
      isActive,
      sortOrder,
      productType,
      maxParticipants,
      webinarSchedule,
    } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 },
      );
    }

    // For webinars, duration is derived from schedule times — skip validation
    const duration = Number(durationMinutes);
    if (productType !== "webinar") {
      if (
        !Number.isInteger(duration) ||
        duration < MIN_DURATION ||
        duration > MAX_DURATION
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Duration must be a whole number between ${MIN_DURATION} and ${MAX_DURATION}`,
          },
          { status: 400 },
        );
      }
    }

    const priceValue = Number(price);
    if (isNaN(priceValue) || priceValue < 0) {
      return NextResponse.json(
        { success: false, error: "Price must be a non-negative number" },
        { status: 400 },
      );
    }

    // Validate color if provided
    if (color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return NextResponse.json(
        {
          success: false,
          error: "Color must be a valid hex color (e.g. #ff0000)",
        },
        { status: 400 },
      );
    }

    const input: CreateProductInput = {
      name: name.trim(),
      description: description?.trim() || undefined,
      durationMinutes: duration,
      price: Math.round(priceValue),
      color: color || undefined,
      image,
      imagePosition,
      imageZoom,
      images: Array.isArray(images) ? images : undefined,
      isActive: isActive ?? true,
      sortOrder: sortOrder ?? 0,
    };

    if (productType === "webinar") {
      input.productType = "webinar";
      input.maxParticipants = maxParticipants
        ? Number(maxParticipants)
        : undefined;
      input.webinarSchedule = webinarSchedule as WebinarSchedule;

      // For webinars, derive duration from first session's times
      if (webinarSchedule?.sessions?.length > 0) {
        const first = webinarSchedule.sessions[0];
        const [sh, sm] = (first.startTime || "09:00").split(":").map(Number);
        const [eh, em] = (first.endTime || "10:00").split(":").map(Number);
        const computedDuration = eh * 60 + em - (sh * 60 + sm);
        input.durationMinutes = computedDuration > 0 ? computedDuration : 60;
      }
    }

    const product = await createProduct(tenant.id, input);

    // Generate session calendar events for webinar products
    if (product.productType === "webinar" && product.webinarSchedule) {
      const timezone = tenant.bookingConfig?.timezone || "Australia/Sydney";
      const sessions = expandWebinarSessions(product.webinarSchedule, timezone);

      console.log(
        `[DBG][products] Generating ${sessions.length} webinar sessions for product ${product.id}`,
      );

      for (const session of sessions) {
        await createCalendarEvent(tenant.id, {
          title: `Webinar: ${product.name}`,
          description: product.description || "",
          startTime: session.startTime,
          endTime: session.endTime,
          date: session.date,
          type: "webinar",
          status: "scheduled",
          color: product.color,
          productId: product.id,
          recurrenceGroupId: product.id,
        });
      }
    }

    console.log(
      `[DBG][products] Created product ${product.id} for tenant ${tenant.id}`,
    );

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    console.error("[DBG][products] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create product" },
      { status: 500 },
    );
  }
}
