import { NextResponse } from 'next/server';
import * as availabilityRepository from '@/lib/repositories/availabilityRepository';
import type { ApiResponse, ExpertAvailability as ExpertAvailabilityType } from '@/types';

/**
 * GET /api/live/experts/[expertId]/availability
 * Get expert's availability schedule (Public - no auth required)
 */
export async function GET(request: Request, { params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = await params;
  console.log('[DBG][api/live/experts/[expertId]/availability] GET request:', expertId);

  try {
    // Get all active availability slots for this expert from DynamoDB
    const availabilities = await availabilityRepository.getActiveAvailabilitiesByExpert(expertId);

    // Sort by dayOfWeek, then startTime
    availabilities.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return (a.dayOfWeek ?? 7) - (b.dayOfWeek ?? 7);
      }
      return a.startTime.localeCompare(b.startTime);
    });

    console.log(
      `[DBG][api/live/experts/[expertId]/availability] Found ${availabilities.length} slots`
    );

    const response: ApiResponse<ExpertAvailabilityType[]> = {
      success: true,
      data: availabilities,
      total: availabilities.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/live/experts/[expertId]/availability] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
