import { NextResponse } from 'next/server';
import { Expert, ApiResponse } from '@/types';

export async function GET() {
  console.log('[DBG][experts/route.ts] GET /data/experts called');
  
  const experts: Expert[] = [
    {
      id: 'expert-1',
      name: 'Sarah Johnson',
      title: 'Vinyasa Flow Master',
      bio: 'With over 15 years of experience, Sarah specializes in dynamic Vinyasa flow sequences.',
      avatar: '/avatars/sarah.jpg',
      rating: 4.9,
      totalCourses: 12,
      totalStudents: 2500,
      specializations: ['Vinyasa', 'Power Yoga', 'Meditation'],
      featured: true
    },
    {
      id: 'expert-2', 
      name: 'Michael Chen',
      title: 'Yin Yoga & Meditation Expert',
      bio: 'Michael brings ancient wisdom to modern practice with deep yin yoga and mindfulness.',
      avatar: '/avatars/michael.jpg',
      rating: 4.8,
      totalCourses: 8,
      totalStudents: 1800,
      specializations: ['Yin Yoga', 'Meditation', 'Pranayama'],
      featured: true
    },
    {
      id: 'expert-3',
      name: 'Emma Rodriguez',
      title: 'Prenatal & Restorative Yoga',
      bio: 'Certified in prenatal and postnatal yoga, Emma helps mothers through their journey.',
      avatar: '/avatars/emma.jpg',
      rating: 5.0,
      totalCourses: 6,
      totalStudents: 900,
      specializations: ['Prenatal', 'Postnatal', 'Restorative'],
      featured: false
    }
  ];

  const response: ApiResponse<Expert[]> = {
    success: true,
    data: experts,
    total: experts.length
  };

  return NextResponse.json(response);
}