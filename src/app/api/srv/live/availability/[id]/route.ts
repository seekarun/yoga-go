import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ExpertAvailability from '@/models/ExpertAvailability';
import type { ApiResponse, ExpertAvailability as ExpertAvailabilityType } from '@/types';

/**
 * PUT /api/srv/live/availability/[id]
 * Update availability slot (Expert only)
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log('[DBG][api/srv/live/availability/[id]] PUT request:', id);

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

    await connectToDatabase();

    // Get existing availability slot
    const availability = await ExpertAvailability.findById(id);
    if (!availability) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Availability slot not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Verify ownership
    if (availability.expertId !== expertId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authorized to update this availability slot',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { dayOfWeek, date, startTime, endTime, isRecurring, isActive } = body;

    // Update fields if provided
    if (dayOfWeek !== undefined) availability.dayOfWeek = dayOfWeek;
    if (date !== undefined) availability.date = date;
    if (startTime !== undefined) availability.startTime = startTime;
    if (endTime !== undefined) availability.endTime = endTime;
    if (isRecurring !== undefined) availability.isRecurring = isRecurring;
    if (isActive !== undefined) availability.isActive = isActive;

    // Validate time format if updated
    if (startTime || endTime) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      const checkStart = startTime || availability.startTime;
      const checkEnd = endTime || availability.endTime;

      if (!timeRegex.test(checkStart) || !timeRegex.test(checkEnd)) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Invalid time format. Use HH:MM (24-hour format)',
        };
        return NextResponse.json(response, { status: 400 });
      }

      // Validate that endTime is after startTime
      if (checkStart >= checkEnd) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'endTime must be after startTime',
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    await availability.save();

    console.log('[DBG][api/srv/live/availability/[id]] Availability updated:', id);

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
      message: 'Availability slot updated successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/srv/live/availability/[id]] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * DELETE /api/srv/live/availability/[id]
 * Delete availability slot (soft delete by setting isActive=false)
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log('[DBG][api/srv/live/availability/[id]] DELETE request:', id);

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

    await connectToDatabase();

    // Get existing availability slot
    const availability = await ExpertAvailability.findById(id);
    if (!availability) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Availability slot not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Verify ownership
    if (availability.expertId !== expertId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authorized to delete this availability slot',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Soft delete by setting isActive = false
    availability.isActive = false;
    await availability.save();

    console.log('[DBG][api/srv/live/availability/[id]] Availability deleted (soft):', id);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Availability slot deleted successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/srv/live/availability/[id]] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
