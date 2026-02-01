/**
 * Expert Webinar Registrations Route
 * GET /data/app/expert/me/webinars/[webinarId]/registrations - List all registrations
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, WebinarRegistration } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import * as webinarRegistrationRepository from '@/lib/repositories/webinarRegistrationRepository';

interface RouteParams {
  params: Promise<{
    webinarId: string;
  }>;
}

interface RegistrationsResponse {
  registrations: WebinarRegistration[];
  total: number;
  byStatus: {
    registered: number;
    cancelled: number;
    attended: number;
    noShow: number;
  };
}

/**
 * GET /data/app/expert/me/webinars/[webinarId]/registrations
 * Get all registrations for a webinar
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { webinarId } = await params;
  console.log('[DBG][expert/me/webinars/[id]/registrations] GET called for:', webinarId);

  try {
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<RegistrationsResponse>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json<ApiResponse<RegistrationsResponse>>(
        { success: false, error: 'Expert profile not found' },
        { status: 403 }
      );
    }

    const webinar = await webinarRepository.getWebinarByIdOnly(webinarId);

    if (!webinar) {
      return NextResponse.json<ApiResponse<RegistrationsResponse>>(
        { success: false, error: 'Webinar not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (webinar.expertId !== user.expertProfile) {
      return NextResponse.json<ApiResponse<RegistrationsResponse>>(
        { success: false, error: 'Not authorized to view registrations for this webinar' },
        { status: 403 }
      );
    }

    // Get filter from query params
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');

    let registrations: WebinarRegistration[];

    if (statusFilter && ['registered', 'cancelled', 'attended', 'no_show'].includes(statusFilter)) {
      registrations = await webinarRegistrationRepository.getRegistrationsByStatus(
        webinar.expertId,
        webinarId,
        statusFilter as WebinarRegistration['status']
      );
    } else {
      registrations = await webinarRegistrationRepository.getRegistrationsByWebinarId(
        webinar.expertId,
        webinarId
      );
    }

    // Sort by registration date (newest first)
    registrations.sort((a, b) => {
      const aDate = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
      const bDate = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
      return bDate - aDate;
    });

    // Count by status
    const byStatus = {
      registered: registrations.filter(r => r.status === 'registered').length,
      cancelled: registrations.filter(r => r.status === 'cancelled').length,
      attended: registrations.filter(r => r.status === 'attended').length,
      noShow: registrations.filter(r => r.status === 'no_show').length,
    };

    console.log(
      '[DBG][expert/me/webinars/[id]/registrations] Found',
      registrations.length,
      'registrations'
    );

    return NextResponse.json<ApiResponse<RegistrationsResponse>>({
      success: true,
      data: {
        registrations,
        total: registrations.length,
        byStatus,
      },
    });
  } catch (error) {
    console.error('[DBG][expert/me/webinars/[id]/registrations] Error:', error);
    return NextResponse.json<ApiResponse<RegistrationsResponse>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch registrations',
      },
      { status: 500 }
    );
  }
}
