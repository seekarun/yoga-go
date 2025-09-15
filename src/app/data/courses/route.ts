import { NextResponse } from 'next/server';
import { Course, ApiResponse } from '@/types';

export async function GET() {
  console.log('[DBG][courses/route.ts] GET /data/courses called');
  
  const courses: Course[] = [
    {
      id: 'course-1',
      title: '30-Day Vinyasa Challenge',
      description: 'Transform your practice with daily Vinyasa flows designed to build strength, flexibility, and mindfulness.',
      instructor: {
        id: 'expert-1',
        name: 'Sarah Johnson'
      },
      thumbnail: '/courses/vinyasa-challenge.jpg',
      level: 'All Levels' as const,
      duration: '30 days',
      totalLessons: 30,
      freeLessons: 3,
      price: 49.99,
      rating: 4.9,
      totalStudents: 850,
      category: 'Vinyasa' as const,
      tags: ['strength', 'flexibility', 'daily practice'],
      featured: true,
      isNew: false
    },
    {
      id: 'course-2',
      title: 'Power Flow Fundamentals',
      description: 'Master the basics of power yoga with this comprehensive beginner-friendly course.',
      instructor: {
        id: 'expert-1',
        name: 'Sarah Johnson'
      },
      thumbnail: '/courses/power-flow.jpg',
      level: 'Beginner' as const,
      duration: '6 weeks',
      totalLessons: 24,
      freeLessons: 2,
      price: 39.99,
      rating: 4.8,
      totalStudents: 650,
      category: 'Power Yoga' as const,
      tags: ['beginner', 'strength', 'fundamentals'],
      featured: false,
      isNew: true
    },
    {
      id: 'course-3',
      title: 'Deep Yin Practice',
      description: 'Explore the gentle, meditative practice of Yin yoga for deep relaxation and flexibility.',
      instructor: {
        id: 'expert-2',
        name: 'Michael Chen'
      },
      thumbnail: '/courses/yin-practice.jpg',
      level: 'All Levels' as const,
      duration: '8 weeks',
      totalLessons: 16,
      freeLessons: 2,
      price: 44.99,
      rating: 4.9,
      totalStudents: 420,
      category: 'Yin Yoga' as const,
      tags: ['relaxation', 'flexibility', 'meditation'],
      featured: true,
      isNew: false
    },
    {
      id: 'course-4',
      title: 'Meditation Mastery',
      description: 'Develop a consistent meditation practice with guided techniques from beginner to advanced.',
      instructor: {
        id: 'expert-2',
        name: 'Michael Chen'
      },
      thumbnail: '/courses/meditation.jpg',
      level: 'Beginner to Advanced' as const,
      duration: '4 weeks',
      totalLessons: 20,
      freeLessons: 4,
      price: 29.99,
      rating: 4.7,
      totalStudents: 580,
      category: 'Meditation' as const,
      tags: ['mindfulness', 'stress relief', 'mental clarity'],
      featured: false,
      isNew: false
    },
    {
      id: 'course-5',
      title: 'Prenatal Yoga Journey',
      description: 'Safe and nurturing yoga practices for every trimester of pregnancy.',
      instructor: {
        id: 'expert-3',
        name: 'Emma Rodriguez'
      },
      thumbnail: '/courses/prenatal.jpg',
      level: 'All Trimesters' as const,
      duration: '12 weeks',
      totalLessons: 36,
      freeLessons: 3,
      price: 59.99,
      rating: 5.0,
      totalStudents: 350,
      category: 'Prenatal' as const,
      tags: ['pregnancy', 'gentle', 'safe practice'],
      featured: true,
      isNew: false
    },
    {
      id: 'course-6',
      title: 'Postnatal Recovery',
      description: 'Gentle yoga practices to help new mothers recover and reconnect with their bodies.',
      instructor: {
        id: 'expert-3',
        name: 'Emma Rodriguez'
      },
      thumbnail: '/courses/postnatal.jpg',
      level: 'New Mothers' as const,
      duration: '6 weeks',
      totalLessons: 18,
      freeLessons: 2,
      price: 34.99,
      rating: 4.9,
      totalStudents: 280,
      category: 'Postnatal' as const,
      tags: ['recovery', 'gentle', 'core strength'],
      featured: false,
      isNew: true
    }
  ];

  const response: ApiResponse<Course[]> = {
    success: true,
    data: courses,
    total: courses.length
  };

  return NextResponse.json(response);
}