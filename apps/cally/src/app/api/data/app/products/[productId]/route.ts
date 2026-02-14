/**
 * Single Product API Routes (Authenticated)
 * GET    /api/data/app/products/[productId] - Get a product
 * PUT    /api/data/app/products/[productId] - Update a product
 * DELETE /api/data/app/products/[productId] - Delete a product
 */

import { NextResponse } from "next/server";
import type { ApiResponse, Product } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getProductById,
  updateProduct,
  deleteProduct,
} from "@/lib/repositories/productRepository";
import { updateEventColorByProductId } from "@/lib/repositories/calendarEventRepository";

const MIN_DURATION = 5;
const MAX_DURATION = 480;

interface RouteParams {
  params: Promise<{
    productId: string;
  }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<Product>>> {
  const { productId } = await params;
  console.log("[DBG][products] GET single called:", productId);

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

    const product = await getProductById(tenant.id, productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("[DBG][products] GET single error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<Product>>> {
  const { productId } = await params;
  console.log("[DBG][products] PUT called:", productId);

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
    const updates: Partial<Omit<Product, "id" | "createdAt">> = {};

    // Validate name if provided
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: "Name must be a non-empty string" },
          { status: 400 },
        );
      }
      updates.name = body.name.trim();
    }

    // Validate description if provided
    if (body.description !== undefined) {
      updates.description = body.description?.trim() || undefined;
    }

    // Validate durationMinutes if provided
    if (body.durationMinutes !== undefined) {
      const duration = Number(body.durationMinutes);
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
      updates.durationMinutes = duration;
    }

    // Validate price if provided
    if (body.price !== undefined) {
      const priceValue = Number(body.price);
      if (isNaN(priceValue) || priceValue < 0) {
        return NextResponse.json(
          { success: false, error: "Price must be a non-negative number" },
          { status: 400 },
        );
      }
      updates.price = Math.round(priceValue);
    }

    // Validate color if provided
    if (body.color !== undefined) {
      if (body.color && !/^#[0-9a-fA-F]{6}$/.test(body.color)) {
        return NextResponse.json(
          {
            success: false,
            error: "Color must be a valid hex color (e.g. #ff0000)",
          },
          { status: 400 },
        );
      }
      updates.color = body.color || undefined;
    }

    // Optional fields
    if (body.image !== undefined) updates.image = body.image;
    if (body.imagePosition !== undefined)
      updates.imagePosition = body.imagePosition;
    if (body.imageZoom !== undefined) updates.imageZoom = body.imageZoom;
    if (body.images !== undefined)
      updates.images = Array.isArray(body.images) ? body.images : undefined;
    if (body.isActive !== undefined) updates.isActive = !!body.isActive;
    if (body.sortOrder !== undefined)
      updates.sortOrder = Number(body.sortOrder);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const product = await updateProduct(tenant.id, productId, updates);
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 },
      );
    }

    // Propagate color change to future calendar events linked to this product
    if (updates.color && product.color) {
      updateEventColorByProductId(tenant.id, productId, product.color).catch(
        (err) =>
          console.error(
            "[DBG][products] Failed to propagate color to events:",
            err,
          ),
      );
    }

    console.log(
      `[DBG][products] Updated product ${productId} for tenant ${tenant.id}`,
    );

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("[DBG][products] PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update product" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<null>>> {
  const { productId } = await params;
  console.log("[DBG][products] DELETE called:", productId);

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

    await deleteProduct(tenant.id, productId);

    console.log(
      `[DBG][products] Deleted product ${productId} for tenant ${tenant.id}`,
    );

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("[DBG][products] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete product" },
      { status: 500 },
    );
  }
}
