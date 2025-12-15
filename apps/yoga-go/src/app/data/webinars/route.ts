import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type { ApiResponse, Webinar } from '@/types';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as tenantRepository from '@/lib/repositories/tenantRepository';

/**
 * GET /data/webinars
 * Returns list of upcoming webinars (SCHEDULED status)
 *
 * Query params:
 * - expertId: Filter by expert ID
 * - status: Filter by status (default: SCHEDULED)
 * - includeAll: Include all statuses (for expert dashboard)
 */
export async function GET(request: Request) {
  console.log('[DBG][webinars/route.ts] GET /data/webinars called');

  try {
    const { searchParams } = new URL(request.url);
    const expertId = searchParams.get('expertId');
    const status = searchParams.get('status');
    const includeAll = searchParams.get('includeAll') === 'true';

    // Check if request is from an expert subdomain/domain
    const headersList = await headers();
    const expertIdFromHeader = headersList.get('x-expert-id');
    const isExpertDomain = !!expertIdFromHeader;

    console.log(
      '[DBG][webinars/route.ts] Expert domain:',
      isExpertDomain,
      'Expert ID:',
      expertIdFromHeader
    );

    let webinars: Webinar[];

    // Fetch webinars based on filters
    if (expertId) {
      // For expert dashboard, include drafts and all statuses
      if (includeAll) {
        webinars = await webinarRepository.getWebinarsByExpertId(expertId);
      } else {
        webinars = await webinarRepository.getPublishedWebinarsByExpertId(expertId);
      }
    } else if (status) {
      // Filter by specific status
      webinars = await webinarRepository.getWebinarsByStatus(status as Webinar['status']);
    } else {
      // Default: Get upcoming webinars (SCHEDULED)
      webinars = await webinarRepository.getUpcomingWebinars();

      // If on expert domain, only show webinars from that expert
      if (isExpertDomain && expertIdFromHeader) {
        webinars = webinars.filter(w => w.expertId === expertIdFromHeader);
        console.log('[DBG][webinars/route.ts] Filtered to expert webinars:', webinars.length);
      } else if (!isExpertDomain) {
        // On primary platform, filter by featuredOnPlatform
        const uniqueExpertIds = [...new Set(webinars.map(w => w.expertId))];

        const featuredExpertIds = new Set<string>();
        for (const expId of uniqueExpertIds) {
          const tenant = await tenantRepository.getTenantByExpertId(expId);
          // Include if no tenant (legacy) or if featuredOnPlatform is true
          if (!tenant || tenant.featuredOnPlatform) {
            featuredExpertIds.add(expId);
          }
        }

        webinars = webinars.filter(w => featuredExpertIds.has(w.expertId));

        console.log(
          '[DBG][webinars/route.ts] Filtered to platform-featured webinars:',
          webinars.length
        );
      }
    }

    // Fetch expert data to populate instructor info
    const expertIds = [...new Set(webinars.map(w => w.expertId))];
    const expertPromises = expertIds.map(id => expertRepository.getExpertById(id));
    const experts = await Promise.all(expertPromises);
    const expertMap = new Map(experts.filter(e => e !== null).map(expert => [expert!.id, expert]));

    // Enrich webinars with expert data (for display)
    const enrichedWebinars = webinars.map(webinar => {
      const expert = expertMap.get(webinar.expertId);
      return {
        ...webinar,
        // Add expert info for display (not modifying the stored data)
        expert: expert
          ? {
              id: expert.id,
              name: expert.name,
              title: expert.title,
              avatar: expert.avatar,
            }
          : undefined,
      };
    });

    const response: ApiResponse<typeof enrichedWebinars> = {
      success: true,
      data: enrichedWebinars,
      total: enrichedWebinars.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][webinars/route.ts] Error fetching webinars:', error);
    const response: ApiResponse<Webinar[]> = {
      success: false,
      error: 'Failed to fetch webinars',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
