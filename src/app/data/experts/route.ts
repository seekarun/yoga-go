import { NextResponse } from 'next/server';
import type { ApiResponse, Expert } from '@/types';
import { connectToDatabase } from '@/lib/mongodb';
import ExpertModel from '@/models/Expert';

export async function GET() {
  console.log('[DBG][experts/route.ts] GET /data/experts called');

  try {
    await connectToDatabase();

    // Fetch all experts from MongoDB
    const expertDocs = await ExpertModel.find({}).lean().exec();

    // Transform MongoDB documents to Expert type
    const experts: Expert[] = expertDocs.map(doc => ({
      ...(doc as unknown as Expert),
      id: (doc as { _id: string })._id,
    }));

    const response: ApiResponse<Expert[]> = {
      success: true,
      data: experts,
      total: experts.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][experts/route.ts] Error fetching experts:', error);
    const response: ApiResponse<Expert[]> = {
      success: false,
      error: 'Failed to fetch experts',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
