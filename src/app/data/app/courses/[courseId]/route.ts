import { NextResponse } from 'next/server';
import type { UserCourseData, ApiResponse } from '@/types';

export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  console.log(`[DBG][app/courses/[courseId]/route.ts] GET /data/app/courses/${courseId} called`);

  // In production, you would verify authentication and ownership here
  // For now, we'll return detailed user-specific course data

  const userCourseData: Record<string, UserCourseData> = {
    'course-1': {
      id: 'course-1',
      title: '30-Day Vinyasa Challenge',
      description:
        'Transform your practice with daily Vinyasa flows designed to build strength, flexibility, and mindfulness.',
      longDescription:
        'This comprehensive 30-day program takes you through progressive Vinyasa sequences, each day building upon the last.',
      instructor: {
        id: 'expert-1',
        name: 'Sarah Johnson',
        title: 'Vinyasa Flow Master',
        avatar: '/avatars/sarah.jpg',
      },
      thumbnail: '/courses/vinyasa-challenge.jpg',
      level: 'All Levels' as const,
      duration: '30 days',
      totalLessons: 30,
      completedLessons: 12,
      freeLessons: 3,
      price: 49.99,
      rating: 4.9,
      totalStudents: 850,
      category: 'Vinyasa' as const,
      tags: ['strength', 'flexibility', 'daily practice'],
      percentComplete: 40,
      enrolledAt: '2024-01-01T10:00:00Z',
      lastAccessed: '2024-01-20T14:30:00Z',

      // User's progress
      progress: {
        totalLessons: 30,
        completedLessons: 12,
        percentComplete: 40,
        currentLesson: {
          id: 'lesson-13',
          title: 'Day 13: Core Power Flow',
          duration: '35 min',
          position: 13,
        },
        streak: 5,
        longestStreak: 8,
        totalTimeSpent: 420, // minutes
        averageSessionTime: 35,
        lastCompletedLesson: {
          id: 'lesson-12',
          title: 'Day 12: Balance and Focus',
          completedAt: '2024-01-20T14:30:00Z',
        },
      },

      // Full curriculum with user's completion status
      curriculum: [
        {
          week: 1,
          title: 'Foundation Week',
          lessons: [
            {
              id: 'lesson-1',
              title: 'Welcome & Introduction',
              duration: '15 min',
              completed: true,
              completedAt: '2024-01-01T10:30:00Z',
              notes: 'Great start!',
            },
            {
              id: 'lesson-2',
              title: 'Basic Sun Salutation A',
              duration: '20 min',
              completed: true,
              completedAt: '2024-01-02T10:00:00Z',
            },
            {
              id: 'lesson-3',
              title: 'Sun Salutation B',
              duration: '25 min',
              completed: true,
              completedAt: '2024-01-03T10:00:00Z',
            },
            {
              id: 'lesson-4',
              title: 'Standing Poses Flow',
              duration: '30 min',
              completed: true,
              completedAt: '2024-01-04T10:00:00Z',
            },
            {
              id: 'lesson-5',
              title: 'Balance & Core',
              duration: '25 min',
              completed: true,
              completedAt: '2024-01-05T10:00:00Z',
            },
            {
              id: 'lesson-6',
              title: 'Rest Day Practice',
              duration: '15 min',
              completed: true,
              completedAt: '2024-01-06T10:00:00Z',
            },
            {
              id: 'lesson-7',
              title: 'Week 1 Flow',
              duration: '40 min',
              completed: true,
              completedAt: '2024-01-07T10:00:00Z',
            },
          ],
        },
        {
          week: 2,
          title: 'Building Strength',
          lessons: [
            {
              id: 'lesson-8',
              title: 'Power Flow Basics',
              duration: '35 min',
              completed: true,
              completedAt: '2024-01-08T10:00:00Z',
            },
            {
              id: 'lesson-9',
              title: 'Arm Balances Introduction',
              duration: '30 min',
              completed: true,
              completedAt: '2024-01-09T10:00:00Z',
            },
            {
              id: 'lesson-10',
              title: 'Core Intensive',
              duration: '25 min',
              completed: true,
              completedAt: '2024-01-10T10:00:00Z',
            },
            {
              id: 'lesson-11',
              title: 'Twists and Binds',
              duration: '35 min',
              completed: true,
              completedAt: '2024-01-11T10:00:00Z',
            },
            {
              id: 'lesson-12',
              title: 'Balance and Focus',
              duration: '30 min',
              completed: true,
              completedAt: '2024-01-20T14:30:00Z',
            },
            {
              id: 'lesson-13',
              title: 'Day 13: Core Power Flow',
              duration: '35 min',
              completed: false,
              locked: false,
            },
            {
              id: 'lesson-14',
              title: 'Day 14: Integration Practice',
              duration: '45 min',
              completed: false,
              locked: false,
            },
          ],
        },
        {
          week: 3,
          title: 'Deepening Practice',
          lessons: [
            {
              id: 'lesson-15',
              title: 'Advanced Transitions',
              duration: '40 min',
              completed: false,
              locked: true,
            },
          ],
        },
      ],

      // User's notes
      notes: [
        {
          lessonId: 'lesson-1',
          note: 'Great introduction, feeling motivated!',
          createdAt: '2024-01-01T10:35:00Z',
        },
        {
          lessonId: 'lesson-5',
          note: 'Core work was challenging but good',
          createdAt: '2024-01-05T10:30:00Z',
        },
      ],

      // Achievements
      achievements: [
        {
          id: 'first-week',
          title: 'Week 1 Complete',
          description: 'Completed your first week of practice',
          icon: '🎯',
          unlockedAt: '2024-01-07T10:30:00Z',
        },
        {
          id: 'five-day-streak',
          title: 'On Fire!',
          description: 'Practiced 5 days in a row',
          icon: '🔥',
          unlockedAt: '2024-01-05T10:30:00Z',
        },
      ],

      // Downloads available to enrolled users
      resources: [
        {
          id: 'resource-1',
          title: 'Practice Calendar PDF',
          type: 'pdf',
          url: '/downloads/course-1-calendar.pdf',
          size: '2.3 MB',
        },
        {
          id: 'resource-2',
          title: 'Pose Reference Guide',
          type: 'pdf',
          url: '/downloads/course-1-poses.pdf',
          size: '5.1 MB',
        },
      ],
    },
    'course-3': {
      id: 'course-3',
      title: 'Deep Yin Practice',
      description:
        'Explore the gentle, meditative practice of Yin yoga for deep relaxation and flexibility.',
      instructor: {
        id: 'expert-2',
        name: 'Michael Chen',
      },
      thumbnail: '/courses/yin-practice.jpg',
      level: 'All Levels' as const,
      duration: '8 weeks',
      totalLessons: 16,
      completedLessons: 8,
      freeLessons: 2,
      price: 44.99,
      rating: 4.9,
      totalStudents: 420,
      category: 'Yin Yoga' as const,
      tags: ['relaxation', 'flexibility', 'meditation'],
      percentComplete: 50,
      enrolledAt: '2023-12-15T09:00:00Z',
      lastAccessed: '2024-01-19T20:00:00Z',
      progress: {
        totalLessons: 16,
        completedLessons: 8,
        percentComplete: 50,
        currentLesson: {
          id: 'lesson-9',
          title: 'Week 5: Deep Hip Release',
          duration: '50 min',
          position: 9,
        },
        streak: 3,
        totalTimeSpent: 400,
        averageSessionTime: 50,
      },
    },
  };

  const course = userCourseData[courseId];

  if (!course) {
    const errorResponse: ApiResponse<never> = {
      success: false,
      error: 'Course not found or not enrolled',
    };
    return NextResponse.json(errorResponse, { status: 404 });
  }

  const response: ApiResponse<UserCourseData> = {
    success: true,
    data: course,
  };

  return NextResponse.json(response);
}
