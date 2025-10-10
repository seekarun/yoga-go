import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { getAllCourses } from '@/store/courses';

export async function GET() {
  console.log('[DBG][courses/route.ts] GET /data/courses called');

  const courses = getAllCourses();

  const response: ApiResponse<typeof courses> = {
    success: true,
    data: courses,
    total: courses.length,
  };

  return NextResponse.json(response);
}
