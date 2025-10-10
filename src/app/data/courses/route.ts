import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { allCourses } from '@/data/mockData';

export async function GET() {
  console.log('[DBG][courses/route.ts] GET /data/courses called');

  const response: ApiResponse<typeof allCourses> = {
    success: true,
    data: allCourses,
    total: allCourses.length,
  };

  return NextResponse.json(response);
}
