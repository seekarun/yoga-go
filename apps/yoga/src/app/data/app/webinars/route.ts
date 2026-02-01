/**
 * Authenticated Webinar API Routes
 * GET /data/app/webinars - Get user's webinar registrations
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import * as webinarRegistrationRepository from '@/lib/repositories/webinarRegistrationRepository';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import * as expertRepository from '@/lib/repositories/expertRepository';
import type { ApiResponse, Webinar, WebinarRegistration } from '@/types';

interface WebinarWithRegistration extends Webinar {
  registration: WebinarRegistration;
  expert?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

/**
 * GET /data/app/webinars
 * Returns user's webinar registrations with webinar details
 */
export async function GET(): Promise<NextResponse<ApiResponse<WebinarWithRegistration[]>>> {
  console.log('[DBG][app/webinars] GET request for user webinars');

  try {
    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.cognitoSub;
    console.log('[DBG][app/webinars] Getting webinars for user:', userId);

    // Get user's registrations
    const registrations = await webinarRegistrationRepository.getRegistrationsByUserId(userId);
    console.log('[DBG][app/webinars] Found', registrations.length, 'registrations');

    if (registrations.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Get webinar details for each registration
    const webinarsWithRegistration: WebinarWithRegistration[] = [];

    for (const registration of registrations) {
      const webinar = await webinarRepository.getWebinarByIdOnly(registration.webinarId);
      if (webinar) {
        // Get expert info
        const expert = await expertRepository.getExpertById(webinar.expertId);

        webinarsWithRegistration.push({
          ...webinar,
          registration,
          expert: expert
            ? {
                id: expert.id,
                name: expert.name,
                avatar: expert.avatar,
              }
            : undefined,
        });
      }
    }

    // Sort by next session time (upcoming first)
    const now = new Date().toISOString();
    webinarsWithRegistration.sort((a, b) => {
      const aNextSession = a.sessions?.find(s => s.startTime >= now);
      const bNextSession = b.sessions?.find(s => s.startTime >= now);

      if (!aNextSession && !bNextSession) return 0;
      if (!aNextSession) return 1;
      if (!bNextSession) return -1;

      return aNextSession.startTime.localeCompare(bNextSession.startTime);
    });

    console.log('[DBG][app/webinars] Returning', webinarsWithRegistration.length, 'webinars');

    return NextResponse.json({
      success: true,
      data: webinarsWithRegistration,
    });
  } catch (error) {
    console.error('[DBG][app/webinars] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get webinars',
      },
      { status: 500 }
    );
  }
}
