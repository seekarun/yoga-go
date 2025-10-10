import type { Expert } from '@/types';
import type { IExpertStore } from './interfaces';

// Hardcoded expert data
const mockExperts: Record<string, Expert> = {
  deepak: {
    id: 'deepak',
    name: 'Deepak',
    title: 'Yoga Master & Wellness Coach',
    bio: 'Deepak brings over 20 years of experience in traditional yoga practices, specializing in holistic wellness and mindful movement for modern lifestyles.',
    avatar: '/experts/ygo.deepak.png',
    rating: 4.9,
    totalCourses: 2,
    totalStudents: 3200,
    specializations: ['Hatha Yoga', 'Ashtanga', 'Meditation', 'Pranayama'],
    featured: true,
    certifications: [
      'RYT-500 Yoga Alliance',
      'E-RYT 200',
      'Traditional Yoga Master Certification',
      'Ayurveda Wellness Consultant',
    ],
    experience: '20+ years',
    courses: [
      {
        id: 'course-deepak-1',
        title: 'Traditional Hatha Yoga Practice',
        level: 'All Levels',
        duration: '8 weeks',
        students: 1800,
      },
      {
        id: 'course-deepak-2',
        title: 'Ashtanga Primary Series Mastery',
        level: 'Intermediate',
        duration: '12 weeks',
        students: 1400,
      },
    ],
    socialLinks: {
      instagram: '@deepakyoga',
      website: 'deepakyogawellness.com',
      youtube: '@deepakyogamaster',
    },
  },
  kavitha: {
    id: 'kavitha',
    name: 'Kavitha',
    title: 'Vinyasa Flow & Therapeutic Yoga Expert',
    bio: 'Kavitha is a certified therapeutic yoga instructor with expertise in healing practices, helping students find balance through gentle yet powerful sequences.',
    avatar: '/experts/ygo.kavitha.jpeg',
    rating: 5.0,
    totalCourses: 2,
    totalStudents: 2800,
    specializations: ['Vinyasa Flow', 'Therapeutic Yoga', 'Restorative', 'Yin Yoga'],
    featured: true,
    certifications: [
      'RYT-500 Yoga Alliance',
      'Certified Yoga Therapist (C-IAYT)',
      'Restorative Yoga Teacher Training',
      'Yin Yoga Certification',
    ],
    experience: '15+ years',
    courses: [
      {
        id: 'course-kavitha-1',
        title: 'Gentle Vinyasa Flow Journey',
        level: 'Beginner',
        duration: '6 weeks',
        students: 1500,
      },
      {
        id: 'course-kavitha-2',
        title: 'Therapeutic Yoga for Back Pain Relief',
        level: 'All Levels',
        duration: '8 weeks',
        students: 1300,
      },
    ],
    socialLinks: {
      instagram: '@kavithayoga',
      facebook: 'KavithaTherapeuticYoga',
      youtube: '@kavithayogatherapy',
    },
  },
};

// Expert store implementation
const expertStore: IExpertStore = {
  getAllExperts: () => {
    console.log('[DBG][experts.ts] getAllExperts called');
    return Object.values(mockExperts);
  },

  getExpertById: (id: string) => {
    console.log(`[DBG][experts.ts] getExpertById called with id: ${id}`);
    return mockExperts[id];
  },

  saveExpert: (expert: Expert) => {
    console.log(`[DBG][experts.ts] saveExpert called with expert: ${expert.id}`);
    // No-op for now - placeholder for future implementation
  },
};

// Export functions
export const { getAllExperts, getExpertById, saveExpert } = expertStore;
