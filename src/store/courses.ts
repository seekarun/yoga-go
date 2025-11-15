import type { Course } from '@/types';
import type { ICourseStore } from './interfaces';
import { mockLessons } from './courseItems';

// Hardcoded course data
const mockCourses: Record<string, Course> = {
  'course-deepak-1': {
    id: 'course-deepak-1',
    title: 'Traditional Hatha Yoga Practice',
    description:
      'Master the ancient art of Hatha Yoga with traditional techniques and modern adaptations for holistic wellness.',
    longDescription:
      'This comprehensive 8-week program guides you through the fundamentals of Traditional Hatha Yoga, combining asanas, pranayama, and meditation. Perfect for all levels seeking authentic yogic practice.',
    instructor: {
      id: 'deepak',
      name: 'Deepak',
      title: 'Yoga Master & Wellness Coach',
      avatar: '/experts/ygo.deepak.png',
    },
    thumbnail: '/courses/hatha-traditional.jpg',
    promoVideo: '/videos/hatha-promo.mp4',
    level: 'All Levels',
    duration: '8 weeks',
    totalLessons: 12,
    freeLessons: 3,
    price: 59.99,
    rating: 4.9,
    totalRatings: 342,
    totalStudents: 1800,
    category: 'Hatha',
    tags: ['traditional', 'holistic', 'pranayama', 'meditation'],
    featured: true,
    isNew: false,
    requirements: [
      'Yoga mat',
      'Comfortable clothing',
      'Yoga blocks (optional)',
      'Blanket for meditation',
    ],
    whatYouWillLearn: [
      'Traditional Hatha Yoga asanas with proper alignment',
      'Pranayama breathing techniques',
      'Meditation and mindfulness practices',
      'Energy balancing through yoga',
      'Building a sustainable daily practice',
    ],
    curriculum: [
      {
        week: 1,
        title: 'Foundations of Hatha Yoga',
        lessons: mockLessons['course-deepak-1'].slice(0, 3),
      },
      {
        week: 2,
        title: 'Building Strength and Flexibility',
        lessons: mockLessons['course-deepak-1'].slice(3, 6),
      },
      {
        week: 3,
        title: 'Advanced Postures',
        lessons: mockLessons['course-deepak-1'].slice(6, 9),
      },
      {
        week: 4,
        title: 'Integration and Mastery',
        lessons: mockLessons['course-deepak-1'].slice(9, 12),
      },
    ],
    reviews: [
      {
        id: 'review-d1-1',
        user: 'Priya S.',
        userId: 'user-priya-1',
        rating: 5,
        date: '2024-12-15',
        comment:
          'Deepak is an exceptional teacher. His guidance on traditional techniques is invaluable.',
        verified: true,
        status: 'published' as const,
        courseProgress: 100,
      },
      {
        id: 'review-d1-2',
        user: 'Rajesh M.',
        userId: 'user-rajesh-1',
        rating: 5,
        date: '2024-12-10',
        comment: 'Finally found authentic Hatha yoga! The pranayama sessions are life-changing.',
        verified: true,
        status: 'published' as const,
        courseProgress: 85,
      },
    ],
  },
  'course-deepak-2': {
    id: 'course-deepak-2',
    title: 'Ashtanga Primary Series Mastery',
    description:
      'Dive deep into the dynamic Ashtanga practice with detailed instruction on the Primary Series sequence.',
    longDescription:
      'This intensive 12-week program breaks down the entire Ashtanga Primary Series, teaching proper vinyasa, breath coordination, and the meditative flow of this powerful practice.',
    instructor: {
      id: 'deepak',
      name: 'Deepak',
      title: 'Yoga Master & Wellness Coach',
      avatar: '/experts/ygo.deepak.png',
    },
    thumbnail: '/courses/ashtanga-primary.jpg',
    promoVideo: '/videos/ashtanga-promo.mp4',
    level: 'Intermediate',
    duration: '12 weeks',
    totalLessons: 12,
    freeLessons: 3,
    price: 79.99,
    rating: 4.8,
    totalRatings: 267,
    totalStudents: 1400,
    category: 'Ashtanga',
    tags: ['ashtanga', 'vinyasa', 'dynamic', 'traditional'],
    featured: true,
    isNew: false,
    requirements: [
      'Yoga mat with good grip',
      'Previous yoga experience recommended',
      'Towel',
      'Water bottle',
    ],
    whatYouWillLearn: [
      'Complete Ashtanga Primary Series sequence',
      'Ujjayi breathing and bandhas',
      'Drishti (gaze) points for each pose',
      'Vinyasa transitions and flow',
      'Building strength, flexibility, and stamina',
    ],
    curriculum: [
      {
        week: 1,
        title: 'Introduction and Sun Salutations',
        lessons: mockLessons['course-deepak-2'].slice(0, 3),
      },
      {
        week: 2,
        title: 'Standing Sequence',
        lessons: mockLessons['course-deepak-2'].slice(3, 6),
      },
      {
        week: 3,
        title: 'Seated Sequence',
        lessons: mockLessons['course-deepak-2'].slice(6, 9),
      },
      {
        week: 4,
        title: 'Finishing Sequence and Full Practice',
        lessons: mockLessons['course-deepak-2'].slice(9, 12),
      },
    ],
    reviews: [
      {
        id: 'review-d2-1',
        user: 'Anita K.',
        userId: 'user-anita-1',
        rating: 5,
        date: '2024-12-08',
        comment:
          "The most comprehensive Ashtanga course I've found. Deepak explains every detail perfectly.",
        verified: true,
        status: 'published' as const,
        courseProgress: 95,
      },
      {
        id: 'review-d2-2',
        user: 'Vikram P.',
        userId: 'user-vikram-1',
        rating: 4,
        date: '2024-12-01',
        comment: 'Challenging but rewarding. My practice has transformed significantly.',
        verified: true,
        status: 'published' as const,
        courseProgress: 75,
      },
    ],
  },
  'course-kavitha-1': {
    id: 'course-kavitha-1',
    title: 'Gentle Vinyasa Flow Journey',
    description:
      'Experience the joy of flowing movement through gentle Vinyasa sequences designed for beginners and mindful practitioners.',
    longDescription:
      'This 6-week journey introduces you to the art of Vinyasa yoga with accessible sequences that build strength, flexibility, and inner peace. Perfect for beginners or those seeking a gentler practice.',
    instructor: {
      id: 'kavitha',
      name: 'Kavitha',
      title: 'Vinyasa Flow & Therapeutic Yoga Expert',
      avatar: '/experts/ygo.kavitha.jpeg',
    },
    thumbnail: '/courses/gentle-vinyasa.jpg',
    promoVideo: '/videos/gentle-vinyasa-promo.mp4',
    level: 'Beginner',
    duration: '6 weeks',
    totalLessons: 10,
    freeLessons: 3,
    price: 49.99,
    rating: 5.0,
    totalRatings: 423,
    totalStudents: 1500,
    category: 'Vinyasa',
    tags: ['beginner-friendly', 'gentle', 'flow', 'mindfulness'],
    featured: true,
    isNew: true,
    requirements: [
      'Yoga mat',
      'Comfortable clothing',
      'Yoga blocks (helpful but optional)',
      'Open mind and willingness to learn',
    ],
    whatYouWillLearn: [
      'Fundamentals of Vinyasa flow',
      'Breath-synchronized movement',
      'Building strength gently and safely',
      'Improving flexibility and balance',
      'Cultivating mindfulness through movement',
    ],
    curriculum: [
      {
        week: 1,
        title: 'Introduction to Flow',
        lessons: mockLessons['course-kavitha-1'].slice(0, 3),
      },
      {
        week: 2,
        title: 'Building Your Practice',
        lessons: mockLessons['course-kavitha-1'].slice(3, 6),
      },
      {
        week: 3,
        title: 'Deepening the Flow',
        lessons: mockLessons['course-kavitha-1'].slice(6, 10),
      },
    ],
    reviews: [
      {
        id: 'review-k1-1',
        user: 'Maya L.',
        userId: 'user-maya-1',
        rating: 5,
        date: '2025-01-05',
        comment:
          "Kavitha's teaching is so nurturing and clear. I feel confident in my practice now!",
        verified: true,
        status: 'published' as const,
        courseProgress: 100,
      },
      {
        id: 'review-k1-2',
        user: 'Sophia R.',
        userId: 'user-sophia-1',
        rating: 5,
        date: '2025-01-02',
        comment: 'Perfect for beginners! The gentle pace helped me build a strong foundation.',
        verified: true,
        status: 'published' as const,
        courseProgress: 90,
      },
    ],
  },
  'course-kavitha-2': {
    id: 'course-kavitha-2',
    title: 'Therapeutic Yoga for Back Pain Relief',
    description:
      'Specialized therapeutic yoga sequences designed to alleviate back pain and strengthen your spine safely and effectively.',
    longDescription:
      'This 8-week therapeutic program combines gentle movement, targeted strengthening, and pain relief techniques to help you manage and overcome back pain through yoga.',
    instructor: {
      id: 'kavitha',
      name: 'Kavitha',
      title: 'Vinyasa Flow & Therapeutic Yoga Expert',
      avatar: '/experts/ygo.kavitha.jpeg',
    },
    thumbnail: '/courses/back-pain-relief.jpg',
    promoVideo: '/videos/back-pain-promo.mp4',
    level: 'All Levels',
    duration: '8 weeks',
    totalLessons: 12,
    freeLessons: 3,
    price: 69.99,
    rating: 4.9,
    totalRatings: 389,
    totalStudents: 1300,
    category: 'Restorative',
    tags: ['therapeutic', 'back-pain', 'healing', 'gentle'],
    featured: true,
    isNew: true,
    requirements: [
      'Yoga mat',
      'Yoga blocks (recommended)',
      'Bolster or firm pillows',
      'Blanket for support',
    ],
    whatYouWillLearn: [
      'Understanding back pain and yoga therapy',
      'Safe movements for spine health',
      'Core strengthening for back support',
      'Therapeutic poses for pain relief',
      'Building a sustainable healing practice',
    ],
    curriculum: [
      {
        week: 1,
        title: 'Understanding and Preparation',
        lessons: mockLessons['course-kavitha-2'].slice(0, 3),
      },
      {
        week: 2,
        title: 'Targeted Relief Practices',
        lessons: mockLessons['course-kavitha-2'].slice(3, 6),
      },
      {
        week: 3,
        title: 'Strengthening and Flexibility',
        lessons: mockLessons['course-kavitha-2'].slice(6, 9),
      },
      {
        week: 4,
        title: 'Long-term Care and Maintenance',
        lessons: mockLessons['course-kavitha-2'].slice(9, 12),
      },
    ],
    reviews: [
      {
        id: 'review-k2-1',
        user: 'David W.',
        userId: 'user-david-1',
        rating: 5,
        date: '2025-01-03',
        comment:
          'After years of back pain, this course has been a game-changer. Thank you Kavitha!',
        verified: true,
        status: 'published' as const,
        courseProgress: 100,
      },
      {
        id: 'review-k2-2',
        user: 'Jennifer T.',
        userId: 'user-jennifer-1',
        rating: 5,
        date: '2024-12-28',
        comment:
          "The therapeutic approach is brilliant. I'm pain-free for the first time in years.",
        verified: true,
        status: 'published' as const,
        courseProgress: 80,
      },
    ],
  },
};

// Course store implementation
const courseStore: ICourseStore = {
  getAllCourses: () => {
    console.log('[DBG][courses.ts] getAllCourses called');
    return Object.values(mockCourses);
  },

  getCourseById: (id: string) => {
    console.log(`[DBG][courses.ts] getCourseById called with id: ${id}`);
    return mockCourses[id];
  },

  saveCourse: (course: Course) => {
    console.log(`[DBG][courses.ts] saveCourse called with courseId: ${course.id}`);
    // No-op for now - placeholder for future implementation
  },
};

// Export functions
export const { getAllCourses, getCourseById, saveCourse } = courseStore;
