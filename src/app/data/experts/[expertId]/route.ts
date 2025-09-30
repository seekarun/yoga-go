import { NextResponse } from 'next/server';
import { Expert, ApiResponse } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ expertId: string }> }
) {
  const { expertId } = await params;
  console.log(`[DBG][experts/[expertId]/route.ts] GET /data/experts/${expertId} called`);

  const expertsData: Record<string, Expert> = {
    'deepak': {
      id: 'deepak',
      name: 'Deepak',
      title: 'Yoga Master & Wellness Coach',
      bio: 'Deepak brings over 20 years of experience in traditional yoga practices, specializing in holistic wellness and mindful movement for modern lifestyles.',
      avatar: '/experts/ygo.deepak.png',
      rating: 4.9,
      totalCourses: 15,
      totalStudents: 3200,
      specializations: ['Hatha Yoga', 'Ashtanga', 'Meditation', 'Pranayama'],
      featured: true,
      certifications: [
        'RYT-500 Yoga Alliance',
        'E-RYT 200',
        'Traditional Yoga Master Certification',
        'Ayurveda Wellness Consultant'
      ],
      experience: '20+ years',
      courses: [
        {
          id: 'course-deepak-1',
          title: 'Traditional Hatha Yoga Practice',
          level: 'All Levels',
          duration: '8 weeks',
          students: 1200
        },
        {
          id: 'course-deepak-2',
          title: 'Ashtanga Primary Series',
          level: 'Intermediate',
          duration: '12 weeks',
          students: 800
        },
        {
          id: 'course-deepak-3',
          title: 'Meditation & Pranayama Mastery',
          level: 'All Levels',
          duration: '6 weeks',
          students: 1200
        }
      ],
      socialLinks: {
        instagram: '@deepakyoga',
        website: 'deepakyogawellness.com'
      }
    },
    'kavitha': {
      id: 'kavitha',
      name: 'Kavitha',
      title: 'Vinyasa Flow & Therapeutic Yoga Expert',
      bio: 'Kavitha is a certified therapeutic yoga instructor with expertise in healing practices, helping students find balance through gentle yet powerful sequences.',
      avatar: '/experts/ygo.kavitha.jpeg',
      rating: 5.0,
      totalCourses: 12,
      totalStudents: 2800,
      specializations: ['Vinyasa Flow', 'Therapeutic Yoga', 'Restorative', 'Yin Yoga'],
      featured: true,
      certifications: [
        'RYT-500 Yoga Alliance',
        'Certified Yoga Therapist (C-IAYT)',
        'Restorative Yoga Teacher Training',
        'Yin Yoga Certification'
      ],
      experience: '15+ years',
      courses: [
        {
          id: 'course-kavitha-1',
          title: 'Gentle Vinyasa Flow',
          level: 'Beginner',
          duration: '6 weeks',
          students: 950
        },
        {
          id: 'course-kavitha-2',
          title: 'Therapeutic Yoga for Back Pain',
          level: 'All Levels',
          duration: '4 weeks',
          students: 750
        },
        {
          id: 'course-kavitha-3',
          title: 'Deep Yin & Restorative Practice',
          level: 'All Levels',
          duration: '8 weeks',
          students: 1100
        }
      ],
      socialLinks: {
        instagram: '@kavithayoga',
        facebook: 'KavithaTherapeuticYoga'
      }
    }
  };

  const expert = expertsData[expertId];

  if (!expert) {
    const errorResponse: ApiResponse<never> = {
      success: false,
      error: 'Expert not found'
    };
    return NextResponse.json(errorResponse, { status: 404 });
  }

  const response: ApiResponse<Expert> = {
    success: true,
    data: expert
  };

  return NextResponse.json(response);
}