import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { mockExperts } from '@/data/mockData';

export async function GET(request: Request, { params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = await params;
  console.log(`[DBG][experts/[expertId]/route.ts] GET /data/experts/${expertId} called`);

  const expert = mockExperts[expertId];

  if (!expert) {
    const errorResponse: ApiResponse<never> = {
      success: false,
      error: 'Expert not found',
    };
    return NextResponse.json(errorResponse, { status: 404 });
  }

  const response: ApiResponse<typeof expert> = {
    success: true,
    data: expert,
  };

  return NextResponse.json(response);
}
