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

    // Grant access based on type
    if (type === 'course') {
      // Enroll user in course
      const { enrollUserInCourse } = await import('@/lib/enrollment');
      const enrollResult = await enrollUserInCourse(userId, itemId, paymentId);

      if (!enrollResult.success) {
        console.error('[Razorpay] Enrollment failed:', enrollResult.error);
        return NextResponse.json(
          {
            success: false,
            error: `Payment verified but enrollment failed: ${enrollResult.error}`,
          },
          { status: 500 }
        );
      }

      console.log(`[Razorpay] Enrolled user ${userId} in course ${itemId}`);
    } else if (type === 'subscription') {
      // Update user membership
      const { connectToDatabase } = await import('@/lib/mongodb');
      const User = (await import('@/models/User')).default;

      await connectToDatabase();
      const user = await User.findById(userId);

      if (user) {
        const now = new Date().toISOString();
        const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

        user.membership = {
          type: itemId as 'free' | 'basic' | 'premium' | 'lifetime',
          status: 'active',
          startDate: now,
          renewalDate: oneYearFromNow,
          benefits: [],
        };

        // Add payment to history
        if (!user.billing) {
          user.billing = { paymentHistory: [] };
        }
        if (!user.billing.paymentHistory) {
          user.billing.paymentHistory = [];
        }

        user.billing.paymentHistory.push({
          date: now,
          amount: 0, // Amount should come from payment gateway
          method: 'online',
          status: 'paid',
          description: `Subscription: ${itemId}`,
          invoice: paymentId,
        });

        await user.save();
      }

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
