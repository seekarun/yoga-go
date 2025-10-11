import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { PAYMENT_CONFIG } from '@/config/payment';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, paymentId, signature, type, itemId, userId } = body;

    // Validate required fields
    if (!orderId || !paymentId || !signature || !type || !itemId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', PAYMENT_CONFIG.razorpay.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      console.error('[Razorpay] Signature verification failed');
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    console.log('[Razorpay] Payment verified successfully:', paymentId);

    // TODO: Update database
    // 1. Mark payment as successful
    // await db.payments.update({
    //   where: { orderId },
    //   data: {
    //     paymentId,
    //     status: 'success',
    //     verifiedAt: new Date(),
    //   },
    // });

    // 2. Grant access based on type
    if (type === 'course') {
      // TODO: Create enrollment
      // await db.enrollments.create({
      //   userId,
      //   courseId: itemId,
      //   paymentId,
      //   enrolledAt: new Date(),
      // });
      console.log(`[Razorpay] Enrolled user ${userId} in course ${itemId}`);
    } else if (type === 'subscription') {
      // TODO: Update user membership
      // await db.users.update({
      //   where: { id: userId },
      //   data: {
      //     membershipType: itemId, // 'curious' or 'committed'
      //     membershipStatus: 'active',
      //     membershipStartDate: new Date(),
      //     membershipEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      //   },
      // });
      console.log(`[Razorpay] Updated user ${userId} subscription to ${itemId}`);
    }

    // TODO: Send confirmation email
    // await sendEmail({
    //   to: userEmail,
    //   subject: 'Payment Confirmation',
    //   template: 'payment-success',
    //   data: { paymentId, itemName, amount },
    // });

    return NextResponse.json({
      success: true,
      data: {
        paymentId,
        message: 'Payment verified successfully',
      },
    });
  } catch (error) {
    console.error('[Razorpay] Verification failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Payment verification failed',
      },
      { status: 500 }
    );
  }
}
