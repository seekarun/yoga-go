import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { PAYMENT_CONFIG } from '@/config/payment';
import * as userRepository from '@/lib/repositories/userRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
import { sendInvoiceEmail, getContextualFromEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, paymentId, signature, type, itemId, userId, amount, currency } = body;

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
    }

    // Send invoice email
    try {
      const [user, course] = await Promise.all([
        userRepository.getUserById(userId),
        type === 'course' ? courseRepository.getCourseById(itemId) : null,
      ]);

      if (user?.profile?.email) {
        // Amount from Razorpay is in paise (smallest unit)
        const amountValue = amount ? amount / 100 : 0;
        const currencySymbol =
          currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency || 'INR';

        // Determine from address based on context (expert subdomain vs main domain)
        const referer = request.headers.get('referer');
        const expertId = course?.instructor?.id || null;
        const fromEmail = getContextualFromEmail(expertId, referer);

        await sendInvoiceEmail({
          to: user.profile.email,
          from: fromEmail,
          customerName: user.profile.name || 'Valued Customer',
          orderId: orderId.slice(-8).toUpperCase(),
          orderDate: new Date().toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          paymentMethod: 'Razorpay',
          itemName: course?.title || 'Course Purchase',
          itemDescription: course?.description?.slice(0, 100) || 'Online yoga course access',
          currency: currencySymbol,
          amount: amountValue.toFixed(2),
          transactionId: paymentId,
        });
        console.log(`[Razorpay] Invoice email sent to ${user.profile.email} from ${fromEmail}`);
      } else {
        console.warn('[Razorpay] No user email found, skipping invoice email');
      }
    } catch (emailError) {
      // Log but don't fail the payment if email fails
      console.error('[Razorpay] Failed to send invoice email:', emailError);
    }

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
