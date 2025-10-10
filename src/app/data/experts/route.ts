import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { allExperts } from '@/data/mockData';

export async function GET() {
  console.log('[DBG][experts/route.ts] GET /data/experts called');

  const response: ApiResponse<typeof allExperts> = {
    success: true,
    data: allExperts,
    total: allExperts.length,
  };

  return NextResponse.json(response);
}
