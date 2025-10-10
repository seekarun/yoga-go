import { NextResponse } from 'next/server';
import type { User, ApiResponse } from '@/types';

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  console.log(
    `[DBG][app/user/[userId]/details/route.ts] GET /data/app/user/${userId}/details called`
  );

  // In production, you would verify authentication and that the user can access this data
  // For now, we'll return mock user details

  const userDetails: User = {
    id: userId,
    profile: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      avatar: '/avatars/john-doe.jpg',
      bio: 'Yoga enthusiast on a journey to better health and mindfulness',
      joinedAt: '2023-12-01T10:00:00Z',
      location: 'San Francisco, CA',
      timezone: 'America/Los_Angeles',
    },

    membership: {
      type: 'premium' as const,
      status: 'active' as const,
      startDate: '2023-12-01T10:00:00Z',
      renewalDate: '2024-12-01T10:00:00Z',
      benefits: [
        'Unlimited course access',
        'Downloadable resources',
        'Priority support',
        'Certificate of completion',
        'Community access',
      ],
    },

    statistics: {
      totalCourses: 3,
      completedCourses: 1,
      totalLessons: 66,
      completedLessons: 40,
      totalPracticeTime: 1420, // minutes
      currentStreak: 5,
      longestStreak: 8,
      lastPractice: '2024-01-20T14:30:00Z',
      averageSessionTime: 35, // minutes
      favoriteCategory: 'Vinyasa' as const,
      level: 'Intermediate',
    },

    achievements: [
      {
        id: 'welcome',
        title: 'Welcome to Yoga-GO',
        description: 'Joined the Yoga-GO community',
        icon: '👋',
        unlockedAt: '2023-12-01T10:00:00Z',
        points: 10,
      },
      {
        id: 'first-course',
        title: 'Course Explorer',
        description: 'Enrolled in your first course',
        icon: '📚',
        unlockedAt: '2023-12-01T11:00:00Z',
        points: 20,
      },
      {
        id: 'course-complete',
        title: 'Course Master',
        description: 'Completed your first course',
        icon: '🎓',
        unlockedAt: '2024-01-15T08:00:00Z',
        points: 100,
      },
      {
        id: 'week-streak',
        title: 'Week Warrior',
        description: 'Practiced 7 days in a row',
        icon: '🔥',
        unlockedAt: '2024-01-07T10:00:00Z',
        points: 50,
      },
      {
        id: '10-hours',
        title: 'Dedicated Practitioner',
        description: 'Practiced for 10+ hours total',
        icon: '⏰',
        unlockedAt: '2024-01-10T10:00:00Z',
        points: 75,
      },
    ],

    enrolledCourses: [
      {
        courseId: 'course-1',
        title: '30-Day Vinyasa Challenge',
        instructor: 'Sarah Johnson',
        progress: 40,
        lastAccessed: '2024-01-20T14:30:00Z',
      },
      {
        courseId: 'course-3',
        title: 'Deep Yin Practice',
        instructor: 'Michael Chen',
        progress: 50,
        lastAccessed: '2024-01-19T20:00:00Z',
      },
      {
        courseId: 'course-4',
        title: 'Meditation Mastery',
        instructor: 'Michael Chen',
        progress: 100,
        lastAccessed: '2024-01-15T08:00:00Z',
        completedAt: '2024-01-15T08:00:00Z',
        certificateUrl: '/certificates/user-123-course-4.pdf',
      },
    ],

    preferences: {
      emailNotifications: true,
      pushNotifications: false,
      reminderTime: '08:00',
      reminderDays: ['monday', 'wednesday', 'friday'],
      preferredDuration: '30-45 minutes',
      focusAreas: ['flexibility', 'strength', 'mindfulness'],
      difficultyLevel: 'intermediate',
      language: 'en',
      videoQuality: 'hd' as const,
    },

    billing: {
      lastPayment: {
        date: '2023-12-01T10:00:00Z',
        amount: 99.99,
        method: 'Credit Card (**** 1234)',
        status: 'paid' as const,
      },
      nextPayment: {
        date: '2024-12-01T10:00:00Z',
        amount: 99.99,
        method: 'Credit Card (**** 1234)',
        status: 'scheduled' as const,
      },
      paymentHistory: [
        {
          date: '2023-12-01T10:00:00Z',
          amount: 99.99,
          method: 'Credit Card (**** 1234)',
          description: 'Annual Premium Membership',
          status: 'paid' as const,
          invoice: '/invoices/inv-001.pdf',
        },
      ],
    },

    savedItems: {
      favoriteCourses: ['course-1', 'course-3'],
      watchlist: ['course-2', 'course-5'],
      bookmarkedLessons: [
        {
          courseId: 'course-1',
          lessonId: 'lesson-5',
          title: 'Balance & Core',
          timestamp: '2024-01-05T10:30:00Z',
        },
        {
          courseId: 'course-3',
          lessonId: 'lesson-3',
          title: 'Hip Opening Sequence',
          timestamp: '2024-01-10T15:00:00Z',
        },
      ],
    },

    social: {
      following: ['expert-1', 'expert-2'],
      followers: 12,
      friends: 8,
      sharedAchievements: true,
      publicProfile: true,
    },
  };

  const response: ApiResponse<User> = {
    success: true,
    data: userDetails,
  };

  return NextResponse.json(response);
}
