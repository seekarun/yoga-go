import type { Lesson } from '@/types';
import type { ICourseItemStore } from './interfaces';

// Hardcoded course items (lessons) data
const mockLessons: Record<string, Lesson[]> = {
  'course-deepak-1': [
    {
      id: 'deepak-1-item-1',
      title: 'Introduction to Hatha Yoga',
      duration: '15 min',
      isFree: true,
      description: 'Welcome to Traditional Hatha Yoga. Learn the foundations and philosophy.',
      videoUrl: '/videos/deepak-1-1.mp4',
    },
    {
      id: 'deepak-1-item-2',
      title: 'Basic Asanas and Alignment',
      duration: '25 min',
      isFree: true,
      description: 'Master the fundamental poses with proper alignment techniques.',
      videoUrl: '/videos/deepak-1-2.mp4',
    },
    {
      id: 'deepak-1-item-3',
      title: 'Pranayama Basics',
      duration: '20 min',
      isFree: true,
      description: 'Introduction to yogic breathing techniques.',
      videoUrl: '/videos/deepak-1-3.mp4',
    },
    {
      id: 'deepak-1-item-4',
      title: 'Standing Poses Series',
      duration: '30 min',
      isFree: false,
      description: 'Build strength with classic standing poses.',
      videoUrl: '/videos/deepak-1-4.mp4',
    },
    {
      id: 'deepak-1-item-5',
      title: 'Forward Bends and Hip Openers',
      duration: '28 min',
      isFree: false,
      description: 'Increase flexibility through gentle forward bends.',
      videoUrl: '/videos/deepak-1-5.mp4',
    },
    {
      id: 'deepak-1-item-6',
      title: 'Backbends and Heart Openers',
      duration: '32 min',
      isFree: false,
      description: 'Energize your practice with safe backbending.',
      videoUrl: '/videos/deepak-1-6.mp4',
    },
    {
      id: 'deepak-1-item-7',
      title: 'Twists and Detoxification',
      duration: '27 min',
      isFree: false,
      description: 'Cleanse and rejuvenate with twisting poses.',
      videoUrl: '/videos/deepak-1-7.mp4',
    },
    {
      id: 'deepak-1-item-8',
      title: 'Inversions for Beginners',
      duration: '35 min',
      isFree: false,
      description: 'Safely approach inversions with proper preparation.',
      videoUrl: '/videos/deepak-1-8.mp4',
    },
    {
      id: 'deepak-1-item-9',
      title: 'Restorative Practice',
      duration: '40 min',
      isFree: false,
      description: 'Deep relaxation through restorative poses.',
      videoUrl: '/videos/deepak-1-9.mp4',
    },
    {
      id: 'deepak-1-item-10',
      title: 'Complete Hatha Sequence',
      duration: '45 min',
      isFree: false,
      description: 'Full practice integrating all learned elements.',
      videoUrl: '/videos/deepak-1-10.mp4',
    },
    {
      id: 'deepak-1-item-11',
      title: 'Meditation and Yoga Nidra',
      duration: '30 min',
      isFree: false,
      description: 'Guided meditation and yogic sleep practice.',
      videoUrl: '/videos/deepak-1-11.mp4',
    },
    {
      id: 'deepak-1-item-12',
      title: 'Advanced Practice Integration',
      duration: '50 min',
      isFree: false,
      description: 'Bringing it all together in an advanced sequence.',
      videoUrl: '/videos/deepak-1-12.mp4',
    },
  ],
  'course-deepak-2': [
    {
      id: 'deepak-2-item-1',
      title: 'Ashtanga Philosophy and History',
      duration: '18 min',
      isFree: true,
      description: 'Understanding the eight limbs of Ashtanga yoga.',
      videoUrl: '/videos/deepak-2-1.mp4',
    },
    {
      id: 'deepak-2-item-2',
      title: 'Ujjayi Breathing Technique',
      duration: '20 min',
      isFree: true,
      description: 'Master the victorious breath for Ashtanga practice.',
      videoUrl: '/videos/deepak-2-2.mp4',
    },
    {
      id: 'deepak-2-item-3',
      title: 'Sun Salutation A Deep Dive',
      duration: '25 min',
      isFree: true,
      description: 'Perfect your Surya Namaskar A with detailed instruction.',
      videoUrl: '/videos/deepak-2-3.mp4',
    },
    {
      id: 'deepak-2-item-4',
      title: 'Sun Salutation B Practice',
      duration: '28 min',
      isFree: false,
      description: 'Build heat with Surya Namaskar B variations.',
      videoUrl: '/videos/deepak-2-4.mp4',
    },
    {
      id: 'deepak-2-item-5',
      title: 'Standing Sequence Part 1',
      duration: '35 min',
      isFree: false,
      description: 'First half of the primary series standing poses.',
      videoUrl: '/videos/deepak-2-5.mp4',
    },
    {
      id: 'deepak-2-item-6',
      title: 'Standing Sequence Part 2',
      duration: '35 min',
      isFree: false,
      description: 'Complete the standing sequence with balance poses.',
      videoUrl: '/videos/deepak-2-6.mp4',
    },
    {
      id: 'deepak-2-item-7',
      title: 'Seated Sequence Introduction',
      duration: '40 min',
      isFree: false,
      description: 'Begin the seated primary series poses.',
      videoUrl: '/videos/deepak-2-7.mp4',
    },
    {
      id: 'deepak-2-item-8',
      title: 'Forward Folds and Twists',
      duration: '38 min',
      isFree: false,
      description: 'Deepen your seated practice with folds and twists.',
      videoUrl: '/videos/deepak-2-8.mp4',
    },
    {
      id: 'deepak-2-item-9',
      title: 'Hip Openers and Arm Balances',
      duration: '42 min',
      isFree: false,
      description: 'Challenge yourself with advanced hip work and balances.',
      videoUrl: '/videos/deepak-2-9.mp4',
    },
    {
      id: 'deepak-2-item-10',
      title: 'Backbending Sequence',
      duration: '40 min',
      isFree: false,
      description: 'Explore the full backbending series safely.',
      videoUrl: '/videos/deepak-2-10.mp4',
    },
    {
      id: 'deepak-2-item-11',
      title: 'Finishing Sequence',
      duration: '35 min',
      isFree: false,
      description: 'Complete your practice with the traditional finishing poses.',
      videoUrl: '/videos/deepak-2-11.mp4',
    },
    {
      id: 'deepak-2-item-12',
      title: 'Full Primary Series Flow',
      duration: '90 min',
      isFree: false,
      description: 'The complete Ashtanga Primary Series from start to finish.',
      videoUrl: '/videos/deepak-2-12.mp4',
    },
  ],
  'course-kavitha-1': [
    {
      id: 'kavitha-1-item-1',
      title: 'Welcome to Gentle Vinyasa',
      duration: '12 min',
      isFree: true,
      description: 'Introduction to flowing yoga for all levels.',
      videoUrl: '/videos/kavitha-1-1.mp4',
    },
    {
      id: 'kavitha-1-item-2',
      title: 'Breath and Movement Connection',
      duration: '20 min',
      isFree: true,
      description: 'Learn to synchronize breath with movement.',
      videoUrl: '/videos/kavitha-1-2.mp4',
    },
    {
      id: 'kavitha-1-item-3',
      title: 'Gentle Sun Salutations',
      duration: '22 min',
      isFree: true,
      description: 'Modified sun salutations for beginners.',
      videoUrl: '/videos/kavitha-1-3.mp4',
    },
    {
      id: 'kavitha-1-item-4',
      title: 'Foundation Flow Practice',
      duration: '28 min',
      isFree: false,
      description: 'Build your foundation with gentle flowing sequences.',
      videoUrl: '/videos/kavitha-1-4.mp4',
    },
    {
      id: 'kavitha-1-item-5',
      title: 'Standing Flow Sequence',
      duration: '30 min',
      isFree: false,
      description: 'Strengthen legs with standing pose flows.',
      videoUrl: '/videos/kavitha-1-5.mp4',
    },
    {
      id: 'kavitha-1-item-6',
      title: 'Balance and Core Flow',
      duration: '32 min',
      isFree: false,
      description: 'Develop stability through balance work.',
      videoUrl: '/videos/kavitha-1-6.mp4',
    },
    {
      id: 'kavitha-1-item-7',
      title: 'Hip Opening Flow',
      duration: '35 min',
      isFree: false,
      description: 'Release tension with hip-focused sequences.',
      videoUrl: '/videos/kavitha-1-7.mp4',
    },
    {
      id: 'kavitha-1-item-8',
      title: 'Heart Opening Practice',
      duration: '33 min',
      isFree: false,
      description: 'Open your chest with gentle backbends.',
      videoUrl: '/videos/kavitha-1-8.mp4',
    },
    {
      id: 'kavitha-1-item-9',
      title: 'Energizing Morning Flow',
      duration: '30 min',
      isFree: false,
      description: 'Start your day with an uplifting practice.',
      videoUrl: '/videos/kavitha-1-9.mp4',
    },
    {
      id: 'kavitha-1-item-10',
      title: 'Evening Relaxation Flow',
      duration: '35 min',
      isFree: false,
      description: 'Wind down with a calming evening sequence.',
      videoUrl: '/videos/kavitha-1-10.mp4',
    },
  ],
  'course-kavitha-2': [
    {
      id: 'kavitha-2-item-1',
      title: 'Understanding Back Pain',
      duration: '15 min',
      isFree: true,
      description: 'Learn about common causes and yoga therapy approach.',
      videoUrl: '/videos/kavitha-2-1.mp4',
    },
    {
      id: 'kavitha-2-item-2',
      title: 'Gentle Spine Warm-up',
      duration: '18 min',
      isFree: true,
      description: 'Safe movements to prepare your back.',
      videoUrl: '/videos/kavitha-2-2.mp4',
    },
    {
      id: 'kavitha-2-item-3',
      title: 'Core Strengthening Basics',
      duration: '22 min',
      isFree: true,
      description: 'Build core support for a healthy back.',
      videoUrl: '/videos/kavitha-2-3.mp4',
    },
    {
      id: 'kavitha-2-item-4',
      title: 'Lower Back Relief Sequence',
      duration: '25 min',
      isFree: false,
      description: 'Targeted poses for lower back pain.',
      videoUrl: '/videos/kavitha-2-4.mp4',
    },
    {
      id: 'kavitha-2-item-5',
      title: 'Upper Back and Neck Release',
      duration: '23 min',
      isFree: false,
      description: 'Release tension in upper back and shoulders.',
      videoUrl: '/videos/kavitha-2-5.mp4',
    },
    {
      id: 'kavitha-2-item-6',
      title: 'Spinal Twists for Mobility',
      duration: '26 min',
      isFree: false,
      description: 'Gentle twists to improve spine flexibility.',
      videoUrl: '/videos/kavitha-2-6.mp4',
    },
    {
      id: 'kavitha-2-item-7',
      title: 'Hip Flexor Release',
      duration: '24 min',
      isFree: false,
      description: 'Address tight hips affecting your back.',
      videoUrl: '/videos/kavitha-2-7.mp4',
    },
    {
      id: 'kavitha-2-item-8',
      title: 'Hamstring Flexibility',
      duration: '27 min',
      isFree: false,
      description: 'Safely stretch hamstrings for back health.',
      videoUrl: '/videos/kavitha-2-8.mp4',
    },
    {
      id: 'kavitha-2-item-9',
      title: 'Therapeutic Backbends',
      duration: '28 min',
      isFree: false,
      description: 'Strengthen and heal with safe backbending.',
      videoUrl: '/videos/kavitha-2-9.mp4',
    },
    {
      id: 'kavitha-2-item-10',
      title: 'Restorative Back Care',
      duration: '30 min',
      isFree: false,
      description: 'Deep healing through restorative poses.',
      videoUrl: '/videos/kavitha-2-10.mp4',
    },
    {
      id: 'kavitha-2-item-11',
      title: 'Daily Maintenance Practice',
      duration: '20 min',
      isFree: false,
      description: 'Quick daily routine for ongoing back health.',
      videoUrl: '/videos/kavitha-2-11.mp4',
    },
    {
      id: 'kavitha-2-item-12',
      title: 'Complete Therapeutic Sequence',
      duration: '40 min',
      isFree: false,
      description: 'Full practice for comprehensive back care.',
      videoUrl: '/videos/kavitha-2-12.mp4',
    },
  ],
};

// CourseItem store implementation
const courseItemStore: ICourseItemStore = {
  getAllCourseItems: () => {
    console.log('[DBG][courseItems.ts] getAllCourseItems called');
    return mockLessons;
  },

  getCourseItemsByCourseId: (courseId: string) => {
    console.log(`[DBG][courseItems.ts] getCourseItemsByCourseId called with courseId: ${courseId}`);
    return mockLessons[courseId];
  },

  getCourseItemById: (courseId: string, itemId: string) => {
    console.log(
      `[DBG][courseItems.ts] getCourseItemById called with courseId: ${courseId}, itemId: ${itemId}`
    );
    const items = mockLessons[courseId];
    if (!items) return undefined;
    return items.find(item => item.id === itemId);
  },

  saveCourseItem: (courseId: string, lesson: Lesson) => {
    console.log(
      `[DBG][courseItems.ts] saveCourseItem called with courseId: ${courseId}, lessonId: ${lesson.id}`
    );
    // No-op for now - placeholder for future implementation
  },
};

// Export functions
export const { getAllCourseItems, getCourseItemsByCourseId, getCourseItemById, saveCourseItem } =
  courseItemStore;

// Export the mock data for use in courses store
export { mockLessons };
