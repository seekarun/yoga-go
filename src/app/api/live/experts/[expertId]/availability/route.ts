import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import ExpertAvailability from '@/models/ExpertAvailability';
import type { ApiResponse, ExpertAvailability as ExpertAvailabilityType } from '@/types';

/**
 * GET /api/live/experts/[expertId]/availability
 * Get expert's availability schedule (Public - no auth required)
 */
export async function GET(request: Request, { params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = await params;
  console.log('[DBG][api/live/experts/[expertId]/availability] GET request:', expertId);

  try {
    await connectToDatabase();

    // Get all active availability slots for this expert
    const availabilities = await ExpertAvailability.find({
      expertId,
      isActive: true,
    }).sort({ dayOfWeek: 1, startTime: 1 });

    // Transform to include 'id' field
    const data: ExpertAvailabilityType[] = availabilities.map(av => ({
      id: av._id,
      expertId: av.expertId,
      dayOfWeek: av.dayOfWeek,
      date: av.date,
      startTime: av.startTime,
      endTime: av.endTime,
      isRecurring: av.isRecurring,
      isActive: av.isActive,
      createdAt: av.createdAt,
      updatedAt: av.updatedAt,
    }));

    console.log(`[DBG][api/live/experts/[expertId]/availability] Found ${data.length} slots`);

    const response: ApiResponse<ExpertAvailabilityType[]> = {
      success: true,
      data,
      total: data.length,
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
