import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { PAYMENT_CONFIG } from '@/config/payment';
import * as tenantUserRepository from '@/lib/repositories/tenantUserRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import {
  sendBrandedInvoiceEmail,
  sendWebinarRegistrationEmail,
  getContextualFromEmail,
} from '@/lib/email';
import { getTenantById } from '@/lib/repositories/tenantRepository';
import type { SupportedCurrency } from '@/types';
import { getCurrencySymbol } from '@/lib/currency/currencyService';

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
    if (type === 'boost') {
      // Boost payment - no enrollment needed
      // The boost status will be updated by the confirm-payment endpoint
      console.log(`[Razorpay] Boost payment verified for boost ${itemId}`);
    } else if (type === 'course') {
      // Get course to find tenantId
      const course = await courseRepository.getCourseByIdOnly(itemId);
      if (!course) {
        return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
      }
      const tenantId = course.instructor.id;

      // Enroll user in course
      const { enrollUserInCourse } = await import('@/lib/enrollment');
      const enrollResult = await enrollUserInCourse(tenantId, userId, itemId, paymentId);

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

      console.log(`[Razorpay] Enrolled user ${userId} in course ${itemId} for tenant ${tenantId}`);
    } else if (type === 'webinar') {
      // Get webinar to find tenantId
      const webinar = await webinarRepository.getWebinarByIdOnly(itemId);
      if (!webinar) {
        return NextResponse.json({ success: false, error: 'Webinar not found' }, { status: 404 });
      }
      const tenantId = webinar.expertId;

      // Get user info from tenant for registration
      const user = await tenantUserRepository.getTenantUser(tenantId, userId);
      const userName = user?.name || 'Guest';
      const userEmail = user?.email || '';

      // Register user for webinar
      const { registerUserForWebinar } = await import('@/lib/enrollment');
      const registrationResult = await registerUserForWebinar(
        tenantId,
        userId,
        itemId,
        userName,
        userEmail,
        paymentId
      );

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

      console.log(
        `[Razorpay] Registered user ${userId} for webinar ${itemId} in tenant ${tenantId}`
      );
    }

    // Send invoice/confirmation email
    try {
      // Use cross-tenant lookups for course/webinar
      const course = type === 'course' ? await courseRepository.getCourseByIdOnly(itemId) : null;
      const webinar =
        type === 'webinar' ? await webinarRepository.getWebinarByIdOnly(itemId) : null;

      // Get tenantId from course/webinar to look up user
      const tenantIdForEmail = course?.instructor?.id || webinar?.expertId || null;
      const user = tenantIdForEmail
        ? await tenantUserRepository.getTenantUser(tenantIdForEmail, userId)
        : null;

      if (user?.email) {
        // Amount from Razorpay is in paise (smallest unit)
        const amountValue = amount ? amount / 100 : 0;
        const currencySymbol = getCurrencySymbol((currency || 'INR') as SupportedCurrency);

        // Determine from address based on context (expert subdomain vs main domain)
        const referer = request.headers.get('referer');
        const expertId = course?.instructor?.id || webinar?.expertId || null;
        const fromEmail = getContextualFromEmail(expertId, referer);

        if (type === 'webinar' && webinar) {
          // Send webinar registration confirmation email
          await sendWebinarRegistrationEmail({
            to: user.email,
            from: fromEmail,
            customerName: user.name || 'Valued Customer',
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
            `[Razorpay] Webinar registration email sent to ${user.email} from ${fromEmail}`
          );
        } else {
          // Send branded course invoice email
          if (expertId) {
            const tenant = await getTenantById(expertId);
            if (tenant) {
              await sendBrandedInvoiceEmail({
                to: user.email,
                customerName: user.name || 'Valued Customer',
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
                expert: {
                  id: tenant.id,
                  name: tenant.name,
                  logo: tenant.customLandingPage?.branding?.logo,
                  avatar: tenant.avatar,
                  primaryColor: tenant.customLandingPage?.theme?.primaryColor,
                  palette: tenant.customLandingPage?.theme?.palette,
                },
              });
              console.log(
                `[Razorpay] Branded invoice email sent to ${user.email} for expert ${expertId}`
              );
            } else {
              console.warn(`[Razorpay] Tenant not found for expertId: ${expertId}, skipping email`);
            }
          } else {
            console.warn('[Razorpay] No expertId found for course, skipping invoice email');
          }
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
