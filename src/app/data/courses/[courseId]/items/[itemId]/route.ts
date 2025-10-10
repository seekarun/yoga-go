import { NextResponse } from 'next/server';
import type { Lesson, ApiResponse } from '@/types';
import { mockLessons } from '@/data/mockData';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string; itemId: string }> }
) {
  const { courseId, itemId } = await params;
  console.log(
    `[DBG][courses/[courseId]/items/[itemId]/route.ts] GET /data/courses/${courseId}/items/${itemId} called`
  );

  const items = mockLessons[courseId];

  if (!items) {
    const errorResponse: ApiResponse<never> = {
      success: false,
      error: 'Course not found',
    };
    return NextResponse.json(errorResponse, { status: 404 });
  }

  const item = items.find(lesson => lesson.id === itemId);

  if (!item) {
    const errorResponse: ApiResponse<never> = {
      success: false,
      error: 'Course item not found',
    };
    return NextResponse.json(errorResponse, { status: 404 });
  }

  const response: ApiResponse<Lesson> = {
    success: true,
    data: item,
  };

  return NextResponse.json(response);
}
