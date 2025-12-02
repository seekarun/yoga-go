import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import * as availabilityRepository from '@/lib/repositories/availabilityRepository';
import type { ApiResponse, ExpertAvailability as ExpertAvailabilityType } from '@/types';

/**
 * GET /api/srv/live/availability
 * Get all availability slots for the authenticated expert
 */
export async function GET() {
  console.log('[DBG][api/srv/live/availability] GET request received');

  try {
    // Check authentication
    const session = await getSession();
    if (!session || !session.user || !session.user.cognitoSub) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get user from database
    const user = await getUserByAuth0Id(session.user.cognitoSub);
    if (!user || !user.expertProfile) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not an expert',
      };
      return NextResponse.json(response, { status: 403 });
    }

    const expertId = user.expertProfile;

    // Fetch all active availability slots for this expert from DynamoDB
    const availabilitySlots =
      await availabilityRepository.getActiveAvailabilitiesByExpert(expertId);

    // Sort: Recurring first, then by day of week, then by date, then by start time
    availabilitySlots.sort((a, b) => {
      // Recurring first
      if (a.isRecurring !== b.isRecurring) {
        return a.isRecurring ? -1 : 1;
      }
      // Then by day of week
      if (a.dayOfWeek !== b.dayOfWeek) {
        return (a.dayOfWeek ?? 7) - (b.dayOfWeek ?? 7);
      }
      // Then by date
      if (a.date !== b.date) {
        return (a.date ?? '').localeCompare(b.date ?? '');
      }
      // Then by start time
      return a.startTime.localeCompare(b.startTime);
    });

    console.log(
      '[DBG][api/srv/live/availability] Found',
      availabilitySlots.length,
      'slots for expert:',
      expertId
    );

    const response: ApiResponse<ExpertAvailabilityType[]> = {
      success: true,
      data: availabilitySlots,
      total: availabilitySlots.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/srv/live/availability] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/srv/live/availability
 * Create new availability slot (Expert only)
 */
export async function POST(request: Request) {
  console.log('[DBG][api/srv/live/availability] POST request received');

  try {
    // Check authentication
    const session = await getSession();
    if (!session || !session.user || !session.user.cognitoSub) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get user from database
    const user = await getUserByAuth0Id(session.user.cognitoSub);
    if (!user || !user.expertProfile) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not an expert',
      };
      return NextResponse.json(response, { status: 403 });
    }

    const expertId = user.expertProfile;

    // Parse request body
    const body = await request.json();
    const {
      dayOfWeek,
      date,
      startTime,
      endTime,
      isRecurring,
      sessionDuration,
      bufferMinutes,
      meetingLink,
    } = body;

    // Validation
    if (!startTime || !endTime) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'startTime and endTime are required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (isRecurring && dayOfWeek === undefined) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'dayOfWeek is required for recurring availability',
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (!isRecurring && !date) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'date is required for one-time availability',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid time format. Use HH:MM (24-hour format)',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate that endTime is after startTime
    if (startTime >= endTime) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'endTime must be after startTime',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate sessionDuration (must be 30 or 60)
    if (sessionDuration && ![30, 60].includes(sessionDuration)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'sessionDuration must be 30 or 60 minutes',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate bufferMinutes (must be 0, 5, 10, or 15)
    if (bufferMinutes !== undefined && ![0, 5, 10, 15].includes(bufferMinutes)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'bufferMinutes must be 0, 5, 10, or 15 minutes',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create availability slot in DynamoDB
    const availability = await availabilityRepository.createAvailability({
      expertId,
      dayOfWeek: isRecurring ? dayOfWeek : undefined,
      date: !isRecurring ? date : undefined,
      startTime,
      endTime,
      isRecurring: isRecurring || false,
      isActive: true,
      sessionDuration: sessionDuration || 60,
      bufferMinutes: bufferMinutes !== undefined ? bufferMinutes : 0,
      meetingLink: meetingLink || '',
    });

    console.log('[DBG][api/srv/live/availability] Availability created:', availability.id);

    const response: ApiResponse<ExpertAvailabilityType> = {
      success: true,
      data: availability,
      message: 'Availability slot created successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/srv/live/availability] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * DELETE /api/srv/live/availability
 * Bulk delete all availability slots for the expert (Expert only)
 * Performs soft delete by setting isActive: false
 */
export async function DELETE() {
  console.log('[DBG][api/srv/live/availability] DELETE request received (bulk delete)');

  try {
    // Check authentication
    const session = await getSession();
    if (!session || !session.user || !session.user.cognitoSub) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get user from database
    const user = await getUserByAuth0Id(session.user.cognitoSub);
    if (!user || !user.expertProfile) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Unauthorized. Only experts can delete availability.',
      };
      return NextResponse.json(response, { status: 403 });
    }

    const expertId = user.expertProfile;

    // Get all active availability slots and soft delete them
    const activeSlots = await availabilityRepository.getActiveAvailabilitiesByExpert(expertId);
    let deletedCount = 0;

    for (const slot of activeSlots) {
      await availabilityRepository.updateAvailability(expertId, slot.id, { isActive: false });
      deletedCount++;
    }

    console.log(
      '[DBG][api/srv/live/availability] Bulk deleted',
      deletedCount,
      'slots for expert:',
      expertId
    );

    const response: ApiResponse<{ deletedCount: number }> = {
      success: true,
      data: { deletedCount },
      message: `Successfully deleted ${deletedCount} availability slot${deletedCount !== 1 ? 's' : ''}`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/srv/live/availability] Error during bulk delete:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
