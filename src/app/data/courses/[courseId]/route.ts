import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { getCourseById } from '@/store/courses';

export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  console.log(`[DBG][courses/[courseId]/route.ts] GET /data/courses/${courseId} called`);

  const course = getCourseById(courseId);

  if (!course) {
    const errorResponse: ApiResponse<never> = {
      success: false,
      error: 'Course not found',
    };
    return NextResponse.json(errorResponse, { status: 404 });
  }

  const response: ApiResponse<typeof course> = {
    success: true,
    data: course,
  };

  return NextResponse.json(response);
}
