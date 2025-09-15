import { NextResponse } from 'next/server';
import { Course, ApiResponse } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;
  console.log(`[DBG][courses/[courseId]/route.ts] GET /data/courses/${courseId} called`);

  const coursesData: Record<string, Course> = {
    'course-1': {
      id: 'course-1',
      title: '30-Day Vinyasa Challenge',
      description: 'Transform your practice with daily Vinyasa flows designed to build strength, flexibility, and mindfulness.',
      longDescription: 'This comprehensive 30-day program takes you through progressive Vinyasa sequences, each day building upon the last. Perfect for practitioners looking to deepen their practice and establish a consistent routine.',
      instructor: {
        id: 'expert-1',
        name: 'Sarah Johnson',
        title: 'Vinyasa Flow Master',
        avatar: '/avatars/sarah.jpg'
      },
      thumbnail: '/courses/vinyasa-challenge.jpg',
      promoVideo: '/videos/vinyasa-promo.mp4',
      level: 'All Levels' as const,
      duration: '30 days',
      totalLessons: 30,
      freeLessons: 3,
      price: 49.99,
      rating: 4.9,
      totalRatings: 245,
      totalStudents: 850,
      category: 'Vinyasa' as const,
      tags: ['strength', 'flexibility', 'daily practice'],
      requirements: [
        'Yoga mat',
        'Comfortable clothing',
        'Water bottle',
        'Optional: Yoga blocks and strap'
      ],
      whatYouWillLearn: [
        'Master fundamental Vinyasa sequences',
        'Build core strength and flexibility',
        'Develop a consistent daily practice',
        'Learn proper breathing techniques',
        'Improve balance and coordination'
      ],
      curriculum: [
        {
          week: 1,
          title: 'Foundation Week',
          lessons: [
            { id: 'lesson-1', title: 'Welcome & Introduction', duration: '15 min', isFree: true },
            { id: 'lesson-2', title: 'Basic Sun Salutation A', duration: '20 min', isFree: true },
            { id: 'lesson-3', title: 'Sun Salutation B', duration: '25 min', isFree: true },
            { id: 'lesson-4', title: 'Standing Poses Flow', duration: '30 min', isFree: false },
            { id: 'lesson-5', title: 'Balance & Core', duration: '25 min', isFree: false }
          ]
        },
        {
          week: 2,
          title: 'Building Strength',
          lessons: [
            { id: 'lesson-6', title: 'Power Flow Basics', duration: '35 min', isFree: false },
            { id: 'lesson-7', title: 'Arm Balances Introduction', duration: '30 min', isFree: false }
          ]
        }
      ],
      reviews: [
        {
          id: 'review-1',
          user: 'Jane D.',
          rating: 5,
          date: '2024-01-15',
          comment: 'Amazing course! Sarah is an excellent instructor and the progression is perfect.'
        },
        {
          id: 'review-2',
          user: 'Mark S.',
          rating: 4,
          date: '2024-01-10',
          comment: 'Great content, really helped me establish a daily practice.'
        }
      ]
    },
    'course-2': {
      id: 'course-2',
      title: 'Power Flow Fundamentals',
      description: 'Master the basics of power yoga with this comprehensive beginner-friendly course.',
      longDescription: 'This 6-week program introduces you to the dynamic world of power yoga. Learn proper alignment, build strength, and develop the confidence to flow through challenging sequences.',
      instructor: {
        id: 'expert-1',
        name: 'Sarah Johnson',
        title: 'Vinyasa Flow Master',
        avatar: '/avatars/sarah.jpg'
      },
      thumbnail: '/courses/power-flow.jpg',
      promoVideo: '/videos/power-flow-promo.mp4',
      level: 'Beginner' as const,
      duration: '6 weeks',
      totalLessons: 24,
      freeLessons: 2,
      price: 39.99,
      rating: 4.8,
      totalRatings: 189,
      totalStudents: 650,
      category: 'Power Yoga' as const,
      tags: ['beginner', 'strength', 'fundamentals'],
      requirements: [
        'Yoga mat',
        'Yoga blocks (recommended)',
        'Towel',
        'Water bottle'
      ],
      whatYouWillLearn: [
        'Power yoga fundamentals and principles',
        'Proper alignment in challenging poses',
        'Build significant upper body strength',
        'Develop core stability',
        'Safe progression techniques'
      ],
      curriculum: [
        {
          week: 1,
          title: 'Introduction to Power Yoga',
          lessons: [
            { id: 'lesson-1', title: 'What is Power Yoga?', duration: '10 min', isFree: true },
            { id: 'lesson-2', title: 'Warm-Up Sequences', duration: '20 min', isFree: true },
            { id: 'lesson-3', title: 'Foundation Poses', duration: '30 min', isFree: false },
            { id: 'lesson-4', title: 'Building Heat', duration: '25 min', isFree: false }
          ]
        }
      ],
      reviews: [
        {
          id: 'review-1',
          user: 'Alex K.',
          rating: 5,
          date: '2024-02-01',
          comment: 'Perfect for beginners! I feel so much stronger already.'
        }
      ]
    },
    'course-3': {
      id: 'course-3',
      title: 'Deep Yin Practice',
      description: 'Explore the gentle, meditative practice of Yin yoga for deep relaxation and flexibility.',
      longDescription: 'This 8-week journey into Yin yoga teaches you to slow down, hold poses longer, and access deep connective tissues. Perfect for balancing an active lifestyle or complementing yang practices.',
      instructor: {
        id: 'expert-2',
        name: 'Michael Chen',
        title: 'Yin Yoga & Meditation Expert',
        avatar: '/avatars/michael.jpg'
      },
      thumbnail: '/courses/yin-practice.jpg',
      promoVideo: '/videos/yin-promo.mp4',
      level: 'All Levels' as const,
      duration: '8 weeks',
      totalLessons: 16,
      freeLessons: 2,
      price: 44.99,
      rating: 4.9,
      totalRatings: 156,
      totalStudents: 420,
      category: 'Yin Yoga' as const,
      tags: ['relaxation', 'flexibility', 'meditation'],
      requirements: [
        'Yoga mat',
        'Bolster or pillows',
        'Blanket',
        'Yoga blocks'
      ],
      whatYouWillLearn: [
        'Principles of Yin yoga philosophy',
        'Long-hold poses for deep tissue release',
        'Meditation and mindfulness techniques',
        'Energy meridians and chi flow',
        'Stress reduction and relaxation'
      ],
      curriculum: [
        {
          week: 1,
          title: 'Introduction to Yin',
          lessons: [
            { id: 'lesson-1', title: 'The Yin Philosophy', duration: '15 min', isFree: true },
            { id: 'lesson-2', title: 'Your First Yin Practice', duration: '45 min', isFree: true },
            { id: 'lesson-3', title: 'Hip Opening Sequence', duration: '50 min', isFree: false }
          ]
        }
      ],
      reviews: [
        {
          id: 'review-1',
          user: 'Sarah M.',
          rating: 5,
          date: '2024-01-20',
          comment: 'So relaxing and grounding. Michael\'s voice is incredibly soothing.'
        }
      ]
    }
  };

  const course = coursesData[courseId];

  if (!course) {
    const errorResponse: ApiResponse<never> = {
      success: false,
      error: 'Course not found'
    };
    return NextResponse.json(errorResponse, { status: 404 });
  }

  const response: ApiResponse<Course> = {
    success: true,
    data: course
  };

  return NextResponse.json(response);
}