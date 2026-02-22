/**
 * POST /api/data/tenants/[tenantId]/webinar/[productId]/cancel-payment
 * Public endpoint to cancel a pending webinar payment and delete the signup
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getWebinarSignup,
  deleteWebinarSignup,
} from "@/lib/repositories/webinarSignupRepository";
import { expireCheckoutSession } from "@/lib/stripe";

interface RouteParams {
  params: Promise<{
    tenantId: string;
    productId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId, productId } = await params;
    const body = (await request.json()) as {
      checkoutSessionId: string;
      email: string;
    };

    const { checkoutSessionId, email } = body;

    if (!checkoutSessionId || !email) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    console.log(
      `[DBG][webinar/cancel-payment] Cancelling payment: tenant=${tenantId} product=${productId} email=${email}`,
    );

    // Verify the signup exists and is in pending_payment status
    const signup = await getWebinarSignup(tenantId, productId, email);
    if (!signup) {
      return NextResponse.json(
        { success: false, error: "Signup not found" },
        { status: 404 },
      );
    }

    if (signup.paymentStatus !== "pending_payment") {
      console.log(
        `[DBG][webinar/cancel-payment] Signup not in pending_payment status: ${signup.paymentStatus}`,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Signup is not in pending payment status",
        },
        { status: 400 },
      );
    }

    // Expire the Stripe Checkout Session
    try {
      await expireCheckoutSession(checkoutSessionId);
      console.log(
        `[DBG][webinar/cancel-payment] Expired checkout session: ${checkoutSessionId}`,
      );
    } catch (err) {
      // Session may already be expired — that's fine
      console.warn(
        "[DBG][webinar/cancel-payment] Could not expire checkout session:",
        err,
      );
    }

    // Delete the pending signup
    await deleteWebinarSignup(tenantId, productId, email);
    console.log(
      `[DBG][webinar/cancel-payment] Deleted pending signup for ${email}`,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DBG][webinar/cancel-payment] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
