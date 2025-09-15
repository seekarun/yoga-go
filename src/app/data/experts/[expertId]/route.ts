import { NextResponse } from 'next/server';
import { Expert, ApiResponse } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ expertId: string }> }
) {
  const { expertId } = await params;
  console.log(`[DBG][experts/[expertId]/route.ts] GET /data/experts/${expertId} called`);

  const expertsData: Record<string, Expert> = {
    'expert-1': {
      id: 'expert-1',
      name: 'Sarah Johnson',
      title: 'Vinyasa Flow Master',
      bio: 'With over 15 years of experience, Sarah specializes in dynamic Vinyasa flow sequences that build strength, flexibility, and mindfulness.',
      avatar: '/avatars/sarah.jpg',
      rating: 4.9,
      totalCourses: 12,
      totalStudents: 2500,
      specializations: ['Vinyasa', 'Power Yoga', 'Meditation'],
      featured: true,
      certifications: [
        'RYT-500 Yoga Alliance',
        'E-RYT 200',
        'YACEP Continuing Education Provider'
      ],
      experience: '15+ years',
      courses: [
        {
          id: 'course-1',
          title: '30-Day Vinyasa Challenge',
          level: 'All Levels',
          duration: '30 days',
          students: 850
        },
        {
          id: 'course-2',
          title: 'Power Flow Fundamentals',
          level: 'Beginner',
          duration: '6 weeks',
          students: 650
        }
      ],
      socialLinks: {
        instagram: '@sarahjohnsonyoga',
        youtube: 'SarahYogaFlow'
      }
    },
    'expert-2': {
      id: 'expert-2',
      name: 'Michael Chen',
      title: 'Yin Yoga & Meditation Expert',
      bio: 'Michael brings ancient wisdom to modern practice with deep yin yoga and mindfulness techniques.',
      avatar: '/avatars/michael.jpg',
      rating: 4.8,
      totalCourses: 8,
      totalStudents: 1800,
      specializations: ['Yin Yoga', 'Meditation', 'Pranayama'],
      featured: true,
      certifications: [
        'RYT-500 Yoga Alliance',
        'Certified Meditation Teacher',
        'Pranayama Specialist'
      ],
      experience: '12+ years',
      courses: [
        {
          id: 'course-3',
          title: 'Deep Yin Practice',
          level: 'All Levels',
          duration: '8 weeks',
          students: 420
        },
        {
          id: 'course-4',
          title: 'Meditation Mastery',
          level: 'Beginner to Advanced',
          duration: '4 weeks',
          students: 580
        }
      ],
      socialLinks: {
        instagram: '@michaelchenyoga',
        website: 'michaelchenyoga.com'
      }
    },
    'expert-3': {
      id: 'expert-3',
      name: 'Emma Rodriguez',
      title: 'Prenatal & Restorative Yoga',
      bio: 'Certified in prenatal and postnatal yoga, Emma helps mothers through their journey with gentle, supportive practices.',
      avatar: '/avatars/emma.jpg',
      rating: 5.0,
      totalCourses: 6,
      totalStudents: 900,
      specializations: ['Prenatal', 'Postnatal', 'Restorative'],
      featured: false,
      certifications: [
        'RYT-200 Yoga Alliance',
        'RPYT Registered Prenatal Yoga Teacher',
        'Restorative Yoga Certification'
      ],
      experience: '8+ years',
      courses: [
        {
          id: 'course-5',
          title: 'Prenatal Yoga Journey',
          level: 'All Trimesters',
          duration: '12 weeks',
          students: 350
        },
        {
          id: 'course-6',
          title: 'Postnatal Recovery',
          level: 'New Mothers',
          duration: '6 weeks',
          students: 280
        }
      ],
      socialLinks: {
        instagram: '@emmayogamom',
        facebook: 'EmmaRodriguezYoga'
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