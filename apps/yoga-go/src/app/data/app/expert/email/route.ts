import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';

interface EmailSettings {
  platformEmail: string;
  forwardingEmail: string | null;
  emailForwardingEnabled: boolean;
}

/**
 * GET /data/app/expert/email
 * Get current expert's email settings
 */
export async function GET() {
  console.log('[DBG][expert-email] GET /data/app/expert/email called');

  try {
    // Check authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<null>, {
        status: 401,
      });
    }

    // Get user and verify expert
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Get expert data
    const expert = await expertRepository.getExpertById(user.expertProfile);
    if (!expert) {
      return NextResponse.json({ success: false, error: 'Expert not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    // Use user's profile email as default forwarding email if not explicitly set
    const forwardingEmail =
      expert.platformPreferences?.forwardingEmail || user.profile?.email || null;

    const emailSettings: EmailSettings = {
      platformEmail: expert.platformPreferences?.defaultEmail || `${expert.id}@myyoga.guru`,
      forwardingEmail,
      emailForwardingEnabled: expert.platformPreferences?.emailForwardingEnabled ?? true,
    };

    console.log('[DBG][expert-email] Email settings retrieved for:', expert.id);

    return NextResponse.json({
      success: true,
      data: emailSettings,
    } as ApiResponse<EmailSettings>);
  } catch (error) {
    console.error('[DBG][expert-email] Error getting email settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get email settings',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * PUT /data/app/expert/email
 * Update expert's email forwarding settings
 */
export async function PUT(request: Request) {
  console.log('[DBG][expert-email] PUT /data/app/expert/email called');

  try {
    // Check authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<null>, {
        status: 401,
      });
    }

    // Get user and verify expert
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Get expert data
    const expert = await expertRepository.getExpertById(user.expertProfile);
    if (!expert) {
      return NextResponse.json({ success: false, error: 'Expert not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    const body = await request.json();
    const { forwardingEmail, emailForwardingEnabled } = body;

    console.log('[DBG][expert-email] Updating email settings:', {
      expertId: expert.id,
      forwardingEmail,
      emailForwardingEnabled,
    });

    // Validate email if provided
    if (forwardingEmail !== undefined && forwardingEmail !== null && forwardingEmail !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(forwardingEmail)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' } as ApiResponse<null>,
          { status: 400 }
        );
      }
    }

    // Update expert's platform preferences
    const updatedPreferences = {
      featuredOnPlatform: expert.platformPreferences?.featuredOnPlatform ?? true,
      ...expert.platformPreferences,
      forwardingEmail: forwardingEmail || null,
      emailForwardingEnabled:
        emailForwardingEnabled ?? expert.platformPreferences?.emailForwardingEnabled ?? true,
    };

    await expertRepository.updateExpert(expert.id, {
      platformPreferences: updatedPreferences,
    });

    const emailSettings: EmailSettings = {
      platformEmail: updatedPreferences.defaultEmail || `${expert.id}@myyoga.guru`,
      forwardingEmail: updatedPreferences.forwardingEmail || null,
      emailForwardingEnabled: updatedPreferences.emailForwardingEnabled ?? true,
    };

    console.log('[DBG][expert-email] Email settings updated for:', expert.id);

    return NextResponse.json({
      success: true,
      data: emailSettings,
      message: 'Email settings updated successfully',
    } as ApiResponse<EmailSettings>);
  } catch (error) {
    console.error('[DBG][expert-email] Error updating email settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update email settings',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
