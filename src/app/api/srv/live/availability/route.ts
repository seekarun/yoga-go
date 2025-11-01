import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ExpertAvailability from '@/models/ExpertAvailability';
import type { ApiResponse, ExpertAvailability as ExpertAvailabilityType } from '@/types';
import { nanoid } from 'nanoid';

/**
 * GET /api/srv/live/availability
 * Get all availability slots for the authenticated expert
 */
export async function GET() {
  console.log('[DBG][api/srv/live/availability] GET request received');

  try {
    // Check authentication
    const session = await getSession();
    if (!session || !session.user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get user from database
    const user = await getUserByAuth0Id(session.user.sub);
    if (!user || !user.expertProfile) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not an expert',
      };
      return NextResponse.json(response, { status: 403 });
    }

    const expertId = user.expertProfile;

    // Connect to database
    await connectToDatabase();

    // Fetch all availability slots for this expert
    const availabilityDocs = await ExpertAvailability.find({ expertId }).sort({
      isRecurring: -1, // Recurring first
      dayOfWeek: 1, // Then by day of week
      date: 1, // Then by date
      startTime: 1, // Then by start time
    });

    // Transform to API format
    const availabilitySlots: ExpertAvailabilityType[] = availabilityDocs.map(doc => ({
      id: doc._id,
      expertId: doc.expertId,
      dayOfWeek: doc.dayOfWeek,
      date: doc.date,
      startTime: doc.startTime,
      endTime: doc.endTime,
      isRecurring: doc.isRecurring,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

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
    if (!session || !session.user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get user from database
    const user = await getUserByAuth0Id(session.user.sub);
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
    const { dayOfWeek, date, startTime, endTime, isRecurring } = body;

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

    await connectToDatabase();

    // Create availability slot
    const availability = new ExpertAvailability({
      _id: nanoid(),
      expertId,
      dayOfWeek: isRecurring ? dayOfWeek : undefined,
      date: !isRecurring ? date : undefined,
      startTime,
      endTime,
      isRecurring: isRecurring || false,
      isActive: true,
    });

    await availability.save();

    console.log('[DBG][api/srv/live/availability] Availability created:', availability._id);

    const data: ExpertAvailabilityType = {
      id: availability._id,
      expertId: availability.expertId,
      dayOfWeek: availability.dayOfWeek,
      date: availability.date,
      startTime: availability.startTime,
      endTime: availability.endTime,
      isRecurring: availability.isRecurring,
      isActive: availability.isActive,
      createdAt: availability.createdAt,
      updatedAt: availability.updatedAt,
    };

    const response: ApiResponse<ExpertAvailabilityType> = {
      success: true,
      data,
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
