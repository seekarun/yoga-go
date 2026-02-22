/**
 * GET /api/data/tenants/[tenantId]/webinar/[productId]
 * Public endpoint — returns webinar details, session schedule, and signup count
 */
import { NextResponse } from "next/server";
import { getProductById } from "@/lib/repositories/productRepository";
import { countWebinarSignups } from "@/lib/repositories/webinarSignupRepository";
import { getWebinarWaitlistByProduct } from "@/lib/repositories/webinarWaitlistRepository";
import { expandWebinarSessions } from "@/lib/webinar/schedule";
import { getTenantById } from "@/lib/repositories/tenantRepository";

interface RouteParams {
  params: Promise<{ tenantId: string; productId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { tenantId, productId } = await params;

  try {
    const product = await getProductById(tenantId, productId);
    if (!product || product.productType !== "webinar" || !product.isActive) {
      return NextResponse.json(
        { success: false, error: "Webinar not found" },
        { status: 404 },
      );
    }

    const tenant = await getTenantById(tenantId);
    const timezone = tenant?.bookingConfig?.timezone || "Australia/Sydney";

    const sessions = product.webinarSchedule
      ? expandWebinarSessions(product.webinarSchedule, timezone)
      : [];

    const signupCount = await countWebinarSignups(tenantId, productId);

    const spotsRemaining = product.maxParticipants
      ? Math.max(0, product.maxParticipants - signupCount)
      : null; // null means unlimited

    let waitlistAvailable = false;
    let waitlistCount = 0;

    if (spotsRemaining === 0) {
      waitlistAvailable = true;
      const waitlistEntries = await getWebinarWaitlistByProduct(
        tenantId,
        productId,
      );
      waitlistCount = waitlistEntries.filter(
        (e) => e.status === "waiting" || e.status === "notified",
      ).length;
      console.log(
        `[DBG][webinar] Webinar ${productId} is full — waitlist count: ${waitlistCount}`,
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        color: product.color,
        images: product.images,
        image: product.image,
        imagePosition: product.imagePosition,
        maxParticipants: product.maxParticipants,
        signupCount,
        spotsRemaining,
        waitlistAvailable,
        waitlistCount,
        sessions,
        timezone,
      },
    });
  } catch (error) {
    console.error("[DBG][webinar] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch webinar" },
      { status: 500 },
    );
  }
}
