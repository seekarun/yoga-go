import { NextResponse } from 'next/server';
import type { ProgressData, ApiResponse } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string; savePoint: string }> }
) {
  const { courseId, savePoint } = await params;
  console.log(
    `[DBG][app/courses/[courseId]/progress/[savePoint]/route.ts] GET /data/app/courses/${courseId}/progress/${savePoint} called`
  );

  // In production, you would verify authentication here
  // For now, we'll return authenticated user's progress data

  const userProgressData: ProgressData = {
    courseId,
    savePoint,
    userId: 'user-123',
    userInfo: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      membership: 'premium',
    },
    progress: {
      courseId,
      userId: 'user-123',
      totalLessons: 30,
      completedLessons: [
        'lesson-1',
        'lesson-2',
        'lesson-3',
        'lesson-4',
        'lesson-5',
        'lesson-6',
        'lesson-7',
        'lesson-8',
        'lesson-9',
        'lesson-10',
        'lesson-11',
        'lesson-12',
      ],
      percentComplete: 40,
      currentLesson: {
        id: `lesson-${savePoint}`,
        title: 'Current Lesson',
        duration: '30 min',
      },
      lastAccessed: new Date().toISOString(),
      totalTimeSpent: 420, // minutes
      streak: 5,
      longestStreak: 8,

      // Detailed session history
      sessions: [
        {
          date: '2024-01-20',
          lessonsCompleted: ['lesson-12'],
          duration: 30,
          notes: 'Felt great today!',
        },
        {
          date: '2024-01-19',
          lessonsCompleted: ['lesson-11'],
          duration: 35,
          notes: undefined,
        },
        {
          date: '2024-01-18',
          lessonsCompleted: ['lesson-10'],
          duration: 25,
          notes: 'Core work was challenging',
        },
      ],

      // User's personal notes
      notes: [
        {
          lessonId: 'lesson-1',
          note: 'Great introduction to the basics',
          timestamp: '2024-01-01T10:30:00Z',
          isPrivate: true,
        },
        {
          lessonId: 'lesson-5',
          note: 'Remember to focus on breathing during balance poses',
          timestamp: '2024-01-05T10:45:00Z',
          isPrivate: true,
        },
      ],

      // Achievements specific to this course
      achievements: [
        {
          id: 'first-lesson',
          title: 'First Step',
          description: 'Completed your first lesson',
          icon: '🎯',
          unlockedAt: '2024-01-01T10:30:00Z',
          points: 10,
        },
        {
          id: 'week-complete',
          title: 'Week Warrior',
          description: 'Completed a full week of practice',
          icon: '🏆',
          unlockedAt: '2024-01-07T10:00:00Z',
          points: 50,
        },
        {
          id: 'five-streak',
          title: 'Consistency Key',
          description: 'Practiced 5 days in a row',
          icon: '🔥',
          unlockedAt: '2024-01-05T10:00:00Z',
          points: 25,
        },
      ],

      // Personalized feedback
      feedback: {
        overall: "You're making excellent progress! Keep up the consistent practice.",
        improvement: 'Try to hold poses a bit longer to build more strength.',
        nextGoal: 'Complete Week 2 to unlock advanced techniques',
      },
    },

    // Next lesson details
    nextLesson: {
      id: `lesson-${parseInt(savePoint) + 1}`,
      title: 'Day 14: Integration Practice',
      duration: '45 min',
      description: "Bringing together everything you've learned so far",
      preview: '/videos/lesson-14-preview.mp4',
      equipment: ['Yoga mat', 'Blocks (optional)'],
      focus: ['Integration', 'Flow', 'Mindfulness'],
    },

    // Personalized recommendations
    recommendations: [
      {
        type: 'tip',
        message: 'You\'re on a 5-day streak! Keep it going to unlock the "Week Warrior" badge.',
        priority: 'high',
      },
      {
        type: 'suggestion',
        message: 'Based on your progress, try adding a 5-minute meditation before each practice.',
        priority: 'medium',
      },
      {
        type: 'reminder',
        message: "Don't forget to hydrate well before and after your practice.",
        priority: 'low',
      },
    ],

    // Community features (for authenticated users)
    community: {
      classmates: 42,
      yourRank: 8,
      recentActivity: [
        {
          user: 'Sarah M.',
          action: 'completed lesson-15',
          timestamp: '2024-01-20T12:00:00Z',
        },
        {
          user: 'Mike T.',
          action: 'earned "Month Master" achievement',
          timestamp: '2024-01-20T11:30:00Z',
        },
      ],
    },
  };

  const response: ApiResponse<ProgressData> = {
    success: true,
    data: userProgressData,
  };

  return NextResponse.json(response);
}
