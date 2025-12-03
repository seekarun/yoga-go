import { NextResponse } from 'next/server';
import { generateAvailableSlots } from '@/lib/availability';
import type { ApiResponse, AvailableSlot } from '@/types';

/**
 * GET /api/live/experts/[expertId]/available-slots?date=YYYY-MM-DD&duration=60
 * Get available time slots for booking (Public - no auth required)
 */
export async function GET(request: Request, { params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = await params;
  console.log('[DBG][api/live/experts/[expertId]/available-slots] GET request:', expertId);

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const durationStr = searchParams.get('duration');

    // Validate required parameters
    if (!date) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'date parameter is required (format: YYYY-MM-DD)',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Parse duration (default 60 minutes)
    const duration = durationStr ? parseInt(durationStr, 10) : 60;
    if (isNaN(duration) || duration < 15 || duration > 240) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'duration must be between 15 and 240 minutes',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate that date is not in the past
    const targetDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (targetDate < today) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Cannot get availability for past dates',
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.log(
      `[DBG][api/live/experts/[expertId]/available-slots] Generating slots for ${date}, duration ${duration}`
    );

    // Generate available slots
    const slots = await generateAvailableSlots(expertId, date, duration);

    console.log(
      `[DBG][api/live/experts/[expertId]/available-slots] Generated ${slots.length} slots`
    );

    const response: ApiResponse<AvailableSlot[]> = {
      success: true,
      data: slots,
      total: slots.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/live/experts/[expertId]/available-slots] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
