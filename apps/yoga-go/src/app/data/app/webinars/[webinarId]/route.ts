/**
 * Authenticated Webinar Detail API Route
 * GET /data/app/webinars/[webinarId] - Get webinar with session links for registered user
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import * as webinarRegistrationRepository from '@/lib/repositories/webinarRegistrationRepository';
import * as expertRepository from '@/lib/repositories/expertRepository';
import type { ApiResponse, Webinar, WebinarRegistration } from '@/types';

interface WebinarWithAccess extends Webinar {
  registration: WebinarRegistration;
  expert?: {
    id: string;
    name: string;
    title?: string;
    avatar?: string;
  };
}

interface RouteParams {
  params: Promise<{
    webinarId: string;
  }>;
}

/**
 * GET /data/app/webinars/[webinarId]
 * Returns webinar with full session details including meeting links
 * Only accessible to registered users
 */
export async function GET(
  _request: Request,
  context: RouteParams
): Promise<NextResponse<ApiResponse<WebinarWithAccess>>> {
  const { webinarId } = await context.params;
  console.log('[DBG][app/webinars/[id]] GET request for webinar:', webinarId);

  try {
    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.cognitoSub;

    // Get webinar
    const webinar = await webinarRepository.getWebinarByIdOnly(webinarId);
    if (!webinar) {
      return NextResponse.json({ success: false, error: 'Webinar not found' }, { status: 404 });
    }

    // Check if user is registered
    const registration = await webinarRegistrationRepository.getRegistration(
      webinar.expertId,
      webinarId,
      userId
    );
    if (!registration || registration.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Not registered for this webinar' },
        { status: 403 }
      );
    }

    // Get expert info
    const expert = await expertRepository.getExpertById(webinar.expertId);

    // Return full webinar with meeting links (registered users only)
    const webinarWithAccess: WebinarWithAccess = {
      ...webinar,
      registration,
      expert: expert
        ? {
            id: expert.id,
            name: expert.name,
            title: expert.title,
            avatar: expert.avatar,
          }
        : undefined,
    };

    console.log('[DBG][app/webinars/[id]] Returning webinar with session access');

    return NextResponse.json({
      success: true,
      data: webinarWithAccess,
    });
  } catch (error) {
    console.error('[DBG][app/webinars/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get webinar',
      },
      { status: 500 }
    );
  }
}
