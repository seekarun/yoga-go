import { NextResponse } from 'next/server';
import type { UserCoursesData, ApiResponse } from '@/types';

export async function GET() {
  console.log('[DBG][app/courses/route.ts] GET /data/app/courses called');

  // In production, you would verify authentication here
  // For now, we'll return user-specific course data

  const userCourses = [
    {
      id: 'course-1',
      title: '30-Day Vinyasa Challenge',
      description:
        'Transform your practice with daily Vinyasa flows designed to build strength, flexibility, and mindfulness.',
      instructor: {
        id: 'expert-1',
        name: 'Sarah Johnson',
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
      lastAccessed: '2024-01-20T14:30:00Z',
      enrolledAt: '2024-01-01T10:00:00Z',
      certificateAvailable: false,
      nextLesson: {
        id: 'lesson-13',
        title: 'Day 13: Core Power Flow',
        duration: '35 min',
      },
      progress: {
        totalLessons: 30,
        completedLessons: 12,
        percentComplete: 40,
        currentLesson: {
          id: 'lesson-13',
          title: 'Day 13: Core Power Flow',
          duration: '35 min',
        },
        streak: 5,
        totalTimeSpent: 420,
        averageSessionTime: 35,
      },
    },
    {
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
      lastAccessed: '2024-01-19T20:00:00Z',
      enrolledAt: '2023-12-15T09:00:00Z',
      certificateAvailable: false,
      nextLesson: {
        id: 'lesson-9',
        title: 'Week 5: Deep Hip Release',
        duration: '50 min',
      },
      progress: {
        totalLessons: 16,
        completedLessons: 8,
        percentComplete: 50,
        currentLesson: {
          id: 'lesson-9',
          title: 'Week 5: Deep Hip Release',
          duration: '50 min',
        },
        streak: 3,
        totalTimeSpent: 400,
        averageSessionTime: 50,
      },
    },
    {
      id: 'course-4',
      title: 'Meditation Mastery',
      description:
        'Develop a consistent meditation practice with guided techniques from beginner to advanced.',
      instructor: {
        id: 'expert-2',
        name: 'Michael Chen',
      },
      thumbnail: '/courses/meditation.jpg',
      level: 'Beginner to Advanced' as const,
      duration: '4 weeks',
      totalLessons: 20,
      completedLessons: 20,
      freeLessons: 4,
      price: 29.99,
      rating: 4.7,
      totalStudents: 580,
      category: 'Meditation' as const,
      tags: ['mindfulness', 'stress relief', 'mental clarity'],
      percentComplete: 100,
      lastAccessed: '2024-01-15T08:00:00Z',
      enrolledAt: '2023-12-01T10:00:00Z',
      certificateAvailable: true,
      certificateUrl: '/certificates/user-123-course-4.pdf',
      completedAt: '2024-01-15T08:00:00Z',
      progress: {
        totalLessons: 20,
        completedLessons: 20,
        percentComplete: 100,
        streak: 0,
        totalTimeSpent: 600,
        averageSessionTime: 30,
      },
    },
  ];

  const recommendedCourses = [
    {
      id: 'course-2',
      title: 'Power Flow Fundamentals',
      description:
        'Master the basics of power yoga with this comprehensive beginner-friendly course.',
      instructor: {
        id: 'expert-1',
        name: 'Sarah Johnson',
      },
      thumbnail: '/courses/power-flow.jpg',
      level: 'Beginner' as const,
      price: 39.99,
      rating: 4.8,
      matchScore: 85, // How well this matches user's interests
      reason: 'Based on your interest in Vinyasa',
    },
    {
      id: 'course-5',
      title: 'Prenatal Yoga Journey',
      description: 'Safe and nurturing yoga practices for every trimester of pregnancy.',
      instructor: {
        id: 'expert-3',
        name: 'Emma Rodriguez',
      },
      thumbnail: '/courses/prenatal.jpg',
      level: 'All Trimesters' as const,
      price: 59.99,
      rating: 5.0,
      matchScore: 60,
      reason: 'Popular with other students',
    },
  ];

  const data: UserCoursesData = {
    enrolled: userCourses,
    recommended: recommendedCourses,
    statistics: {
      totalEnrolled: userCourses.length,
      completed: userCourses.filter(c => c.percentComplete === 100).length,
      inProgress: userCourses.filter(c => c.percentComplete > 0 && c.percentComplete < 100).length,
      totalTimeSpent: userCourses.reduce((acc, c) => acc + c.progress.totalTimeSpent, 0),
      currentStreak: 5,
    },
  };

  const response: ApiResponse<UserCoursesData> = {
    success: true,
    data,
  };

  return NextResponse.json(response);
}
