import { NextResponse } from 'next/server';
import type { ProgressData, ApiResponse } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string; savePoint: string }> }
) {
  const { courseId, savePoint } = await params;
  console.log(
    `[DBG][courses/[courseId]/progress/[savePoint]/route.ts] GET /data/courses/${courseId}/progress/${savePoint} called`
  );

  const progressData: ProgressData = {
    courseId,
    savePoint,
    userId: 'guest-user',
    progress: {
      courseId,
      userId: 'guest-user',
      totalLessons: 30,
      completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
      percentComplete: 10,
      currentLesson: {
        id: `lesson-${savePoint}`,
        title: 'Current Lesson',
        duration: '30 min',
      },
      lastAccessed: new Date().toISOString(),
      totalTimeSpent: 120,
      notes: [
        {
          lessonId: 'lesson-1',
          note: 'Great introduction to the basics',
          timestamp: '2024-01-15T10:30:00Z',
        },
      ],
      achievements: [
        {
          id: 'first-lesson',
          title: 'First Step',
          description: 'Completed your first lesson',
          icon: '🎯',
          unlockedAt: '2024-01-15T10:00:00Z',
        },
      ],
    },
    nextLesson: {
      id: `lesson-${parseInt(savePoint) + 1}`,
      title: 'Next Lesson Title',
      duration: '30 min',
      description: 'Continue your journey with the next lesson',
    },
    recommendations: [
      {
        type: 'tip',
        message: 'Remember to practice daily for best results',
      },
      {
        type: 'suggestion',
        message: 'Try incorporating breathing exercises between lessons',
      },
    ],
  };

  const response: ApiResponse<ProgressData> = {
    success: true,
    data: progressData,
  };

  return NextResponse.json(response);
}
