import { NextResponse } from 'next/server';
import { Expert, ApiResponse } from '@/types';

export async function GET() {
  console.log('[DBG][experts/route.ts] GET /data/experts called');
  
  const experts: Expert[] = [
    {
      id: 'deepak',
      name: 'Deepak',
      title: 'Yoga Master & Wellness Coach',
      bio: 'Deepak brings over 20 years of experience in traditional yoga practices, specializing in holistic wellness and mindful movement for modern lifestyles.',
      avatar: '/experts/ygo.deepak.png',
      rating: 4.9,
      totalCourses: 15,
      totalStudents: 3200,
      specializations: ['Hatha Yoga', 'Ashtanga', 'Meditation', 'Pranayama'],
      featured: true
    },
    {
      id: 'kavitha',
      name: 'Kavitha',
      title: 'Vinyasa Flow & Therapeutic Yoga Expert',
      bio: 'Kavitha is a certified therapeutic yoga instructor with expertise in healing practices, helping students find balance through gentle yet powerful sequences.',
      avatar: '/experts/ygo.kavitha.jpeg',
      rating: 5.0,
      totalCourses: 12,
      totalStudents: 2800,
      specializations: ['Vinyasa Flow', 'Therapeutic Yoga', 'Restorative', 'Yin Yoga'],
      featured: true
    }
  ];

  const response: ApiResponse<Expert[]> = {
    success: true,
    data: experts,
    total: experts.length
  };

  return NextResponse.json(response);
}