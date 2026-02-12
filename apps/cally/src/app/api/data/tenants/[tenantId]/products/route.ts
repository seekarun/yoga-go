/**
 * GET /api/data/tenants/[tenantId]/products
 * Public endpoint to list active products for a tenant
 */

import { NextResponse } from "next/server";
import type { ApiResponse, Product } from "@/types";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import { getActiveProducts } from "@/lib/repositories/productRepository";

interface RouteParams {
  params: Promise<{
    tenantId: string;
  }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<
  NextResponse<ApiResponse<{ products: Product[]; currency: string }>>
> {
  try {
    const { tenantId } = await params;
    console.log("[DBG][tenants/products] GET called for tenant:", tenantId);

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const products = await getActiveProducts(tenantId);

    console.log(
      `[DBG][tenants/products] Returning ${products.length} active products for tenant ${tenantId}`,
    );

    return NextResponse.json({
      success: true,
      data: {
        products,
        currency: tenant.currency ?? "AUD",
      },
    });
  } catch (error) {
    console.error("[DBG][tenants/products] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}
