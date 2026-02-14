/**
 * Product API Routes (Authenticated)
 * GET  /api/data/app/products - List all products for the tenant
 * POST /api/data/app/products - Create a new product
 */

import { NextResponse } from "next/server";
import type { ApiResponse, Product } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getProductsByTenant,
  createProduct,
} from "@/lib/repositories/productRepository";
import type { CreateProductInput } from "@/lib/repositories/productRepository";

const MIN_DURATION = 5;
const MAX_DURATION = 480;

export async function GET(): Promise<NextResponse<ApiResponse<Product[]>>> {
  console.log("[DBG][products] GET called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
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
  request: Request,
): Promise<NextResponse<ApiResponse<Product>>> {
  console.log("[DBG][products] POST called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
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
    } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 },
      );
    }

    const duration = Number(durationMinutes);
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

    const product = await createProduct(tenant.id, input);

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
