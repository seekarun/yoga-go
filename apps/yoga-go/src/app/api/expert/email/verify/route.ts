/**
 * Expert Email Verification API
 *
 * POST - Initiate email verification for expert's custom email
 * GET - Check verification status
 * DELETE - Remove custom email verification
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/repositories/userRepository';
import { getExpertById, updateExpert } from '@/lib/repositories/expertRepository';
import {
  initiateEmailVerification,
  getEmailVerificationStatus,
  deleteEmailIdentity,
  getExpertDefaultEmail,
} from '@/lib/ses-verification';
import type { ApiResponse, Expert } from '@/types';

interface EmailVerificationResponse {
  status: 'NotStarted' | 'Pending' | 'Success' | 'Failed';
  customEmail?: string;
  defaultEmail: string;
  emailVerified: boolean;
}

/**
 * GET - Get current email verification status
 */
export async function GET(): Promise<NextResponse<ApiResponse<EmailVerificationResponse>>> {
  try {
    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json({ success: false, error: 'Not an expert' }, { status: 403 });
    }

    const expert = await getExpertById(user.expertProfile);
    if (!expert) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 });
    }

    const customEmail = expert.platformPreferences?.customEmail;
    const defaultEmail = getExpertDefaultEmail(expert.id);

    // If there's a custom email, check its verification status
    let status: EmailVerificationResponse['status'] = 'NotStarted';
    if (customEmail) {
      const verificationResult = await getEmailVerificationStatus(customEmail);
      status = verificationResult.status;
    }

    return NextResponse.json({
      success: true,
      data: {
        status,
        customEmail,
        defaultEmail,
        emailVerified: expert.platformPreferences?.emailVerified ?? false,
      },
    });
  } catch (error) {
    console.error('[DBG][email-verify] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get email status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Initiate or update custom email verification
 */
export async function POST(request: Request): Promise<NextResponse<ApiResponse<Expert>>> {
  try {
    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json({ success: false, error: 'Not an expert' }, { status: 403 });
    }

    const expert = await getExpertById(user.expertProfile);
    if (!expert) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 });
    }

    const body = await request.json();
    const { email, action } = body;

    if (action === 'check') {
      // Just check the status without initiating
      if (!email) {
        return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
      }

      const verificationResult = await getEmailVerificationStatus(email);

      // If verified, update expert profile
      if (verificationResult.status === 'Success') {
        const updatedExpert = await updateExpert(expert.id, {
          platformPreferences: {
            ...expert.platformPreferences,
            featuredOnPlatform: expert.platformPreferences?.featuredOnPlatform ?? true,
            defaultEmail: getExpertDefaultEmail(expert.id),
            customEmail: email,
            emailVerified: true,
          },
        });

        return NextResponse.json({
          success: true,
          data: updatedExpert,
          message: 'Email verified successfully',
        });
      }

      return NextResponse.json({
        success: true,
        data: expert,
        message: `Verification status: ${verificationResult.status}`,
      });
    }

    // Default action: initiate verification
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
    }

    // Initiate verification with SES
    const result = await initiateEmailVerification(email);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to initiate verification' },
        { status: 500 }
      );
    }

    // Update expert profile with pending custom email (not yet verified)
    const updatedExpert = await updateExpert(expert.id, {
      platformPreferences: {
        ...expert.platformPreferences,
        featuredOnPlatform: expert.platformPreferences?.featuredOnPlatform ?? true,
        defaultEmail: getExpertDefaultEmail(expert.id),
        customEmail: email,
        emailVerified: false, // Will be set to true after verification
      },
    });

    console.log('[DBG][email-verify] Verification initiated for:', email);

    return NextResponse.json({
      success: true,
      data: updatedExpert,
      message: 'Verification email sent. Please check your inbox and click the verification link.',
    });
  } catch (error) {
    console.error('[DBG][email-verify] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate verification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove custom email and reset to default
 */
export async function DELETE(): Promise<NextResponse<ApiResponse<Expert>>> {
  try {
    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json({ success: false, error: 'Not an expert' }, { status: 403 });
    }

    const expert = await getExpertById(user.expertProfile);
    if (!expert) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 });
    }

    const customEmail = expert.platformPreferences?.customEmail;

    // If there was a custom email, delete it from SES
    if (customEmail) {
      await deleteEmailIdentity(customEmail);
    }

    // Update expert profile to remove custom email
    const updatedExpert = await updateExpert(expert.id, {
      platformPreferences: {
        ...expert.platformPreferences,
        featuredOnPlatform: expert.platformPreferences?.featuredOnPlatform ?? true,
        defaultEmail: getExpertDefaultEmail(expert.id),
        customEmail: undefined,
        emailVerified: false,
      },
    });

    console.log('[DBG][email-verify] Custom email removed for expert:', expert.id);

    return NextResponse.json({
      success: true,
      data: updatedExpert,
      message: 'Custom email removed. Emails will now be sent from your default address.',
    });
  } catch (error) {
    console.error('[DBG][email-verify] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove custom email' },
      { status: 500 }
    );
  }
}
