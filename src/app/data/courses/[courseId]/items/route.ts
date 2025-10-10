import { NextResponse } from 'next/server';
import type { Lesson, ApiResponse } from '@/types';
import { mockLessons } from '@/data/mockData';

export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  console.log(
    `[DBG][courses/[courseId]/items/route.ts] GET /data/courses/${courseId}/items called`
  );

  const items = mockLessons[courseId];

  if (!items) {
    const errorResponse: ApiResponse<never> = {
      success: false,
      error: 'Course not found or no items available',
    };
    return NextResponse.json(errorResponse, { status: 404 });
  }

  const response: ApiResponse<Lesson[]> = {
    success: true,
    data: items,
    total: items.length,
  };

  return NextResponse.json(response);
}
