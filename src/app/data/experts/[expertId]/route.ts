import { NextResponse } from 'next/server';
import type { ApiResponse, Expert } from '@/types';
import { connectToDatabase } from '@/lib/mongodb';
import ExpertModel from '@/models/Expert';

export async function GET(request: Request, { params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = await params;
  console.log(`[DBG][experts/[expertId]/route.ts] GET /data/experts/${expertId} called`);

  try {
    await connectToDatabase();

    // Fetch expert from MongoDB
    const expertDoc = await ExpertModel.findById(expertId).lean().exec();

    if (!expertDoc) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: 'Expert not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Transform MongoDB document to Expert type
    const expert: Expert = {
      ...(expertDoc as any),
      id: (expertDoc as any)._id as string,
    };

    const response: ApiResponse<Expert> = {
      success: true,
      data: expert,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][experts/[expertId]/route.ts] Error fetching expert ${expertId}:`, error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to fetch expert',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
