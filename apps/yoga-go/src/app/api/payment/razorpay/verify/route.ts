import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { PAYMENT_CONFIG } from '@/config/payment';
import * as userRepository from '@/lib/repositories/userRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import {
  sendInvoiceEmail,
  sendWebinarRegistrationEmail,
  getContextualFromEmail,
} from '@/lib/email';

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
    } else if (type === 'webinar') {
      // Register user for webinar
      const { registerUserForWebinar } = await import('@/lib/enrollment');
      const registrationResult = await registerUserForWebinar(userId, itemId, paymentId);

      if (!registrationResult.success) {
        console.error('[Razorpay] Webinar registration failed:', registrationResult.error);
        return NextResponse.json(
          {
            success: false,
            error: `Payment verified but registration failed: ${registrationResult.error}`,
          },
          { status: 500 }
        );
      }

      console.log(`[Razorpay] Registered user ${userId} for webinar ${itemId}`);
    }

    // Send invoice/confirmation email
    try {
      const [user, course, webinar] = await Promise.all([
        userRepository.getUserById(userId),
        type === 'course' ? courseRepository.getCourseById(itemId) : null,
        type === 'webinar' ? webinarRepository.getWebinarById(itemId) : null,
      ]);

      if (user?.profile?.email) {
        // Amount from Razorpay is in paise (smallest unit)
        const amountValue = amount ? amount / 100 : 0;
        const currencySymbol =
          currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency || 'INR';

        // Determine from address based on context (expert subdomain vs main domain)
        const referer = request.headers.get('referer');
        const expertId = course?.instructor?.id || webinar?.expertId || null;
        const fromEmail = getContextualFromEmail(expertId, referer);

        if (type === 'webinar' && webinar) {
          // Send webinar registration confirmation email
          await sendWebinarRegistrationEmail({
            to: user.profile.email,
            from: fromEmail,
            customerName: user.profile.name || 'Valued Customer',
            webinarTitle: webinar.title,
            webinarDescription: webinar.description?.slice(0, 200) || '',
            sessions: webinar.sessions.map(s => ({
              title: s.title,
              startTime: s.startTime,
              duration: s.duration,
            })),
            currency: currencySymbol,
            amount: amountValue.toFixed(2),
            transactionId: paymentId,
          });
          console.log(
            `[Razorpay] Webinar registration email sent to ${user.profile.email} from ${fromEmail}`
          );
        } else {
          // Send course invoice email
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
        }
      } else {
        console.warn('[Razorpay] No user email found, skipping email');
      }
    } catch (emailError) {
      // Log but don't fail the payment if email fails
      console.error('[Razorpay] Failed to send email:', emailError);
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
