import { NextResponse } from 'next/server';
import { requireExpertOwnership } from '@/lib/auth';
import * as userRepository from '@/lib/repositories/userRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
import * as courseProgressRepository from '@/lib/repositories/courseProgressRepository';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import * as webinarRegistrationRepository from '@/lib/repositories/webinarRegistrationRepository';
import type { ApiResponse, User } from '@/types';

interface ExpertUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  joinedAt: string;
  coursesEnrolled: number;
  coursesCompleted: number;
  webinarsRegistered: number;
  webinarsAttended: number;
  totalWatchTime: number; // in minutes
  lastActive?: string;
}

interface ExpertUsersResponse {
  users: ExpertUser[];
  total: number;
  summary: {
    totalUsers: number;
    activeUsers: number; // users with activity in last 30 days
    avgCoursesPerUser: number;
    avgWebinarsPerUser: number;
  };
}

/**
 * GET /api/srv/experts/{expertId}/users
 * Get all users who signed up via the expert's space
 */
export async function GET(request: Request, { params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = await params;
  console.log('[DBG][srv/expert-users] GET request for expert:', expertId);

  try {
    // Verify expert ownership
    await requireExpertOwnership(expertId);

    // Get all users who signed up via this expert
    const users = await userRepository.getUsersByExpertId(expertId);
    console.log('[DBG][srv/expert-users] Found', users.length, 'users');

    // Get expert's courses for enrollments lookup
    const courses = await courseRepository.getCoursesByInstructorId(expertId);
    const courseIds = courses.map(c => c.id);

    // Get expert's webinars for registration lookup
    const webinars = await webinarRepository.getWebinarsByExpertId(expertId);
    const webinarIds = webinars.map(w => w.id);

    // Calculate date for active user check (30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    // Process each user to get their activity data
    const expertUsers: ExpertUser[] = await Promise.all(
      users.map(async (user: User) => {
        // Get all course progress for this user
        const userProgress = await courseProgressRepository.getCourseProgressByUserId(user.id);

        // Filter to only this expert's courses
        const expertCourseProgress = userProgress.filter(p => courseIds.includes(p.courseId));

        const coursesEnrolled = expertCourseProgress.length;
        const coursesCompleted = expertCourseProgress.filter(p => p.percentComplete === 100).length;
        const totalWatchTime = expertCourseProgress.reduce(
          (sum, p) => sum + Math.round((p.totalTimeSpent || 0) / 60),
          0
        );

        // Get webinar registrations for this user
        const userRegistrations = await webinarRegistrationRepository.getRegistrationsByUserId(
          user.id
        );

        // Filter to only this expert's webinars
        const expertWebinarRegistrations = userRegistrations.filter(r =>
          webinarIds.includes(r.webinarId)
        );

        const webinarsRegistered = expertWebinarRegistrations.length;
        const webinarsAttended = expertWebinarRegistrations.filter(
          r => r.status === 'attended'
        ).length;

        // Determine last active date
        let lastActive: string | undefined;
        const lastAccessDates: string[] = [];

        for (const p of expertCourseProgress) {
          if (p.lastAccessed) lastAccessDates.push(p.lastAccessed);
        }
        for (const r of expertWebinarRegistrations) {
          if (r.updatedAt) lastAccessDates.push(r.updatedAt);
        }

        if (lastAccessDates.length > 0) {
          lastAccessDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
          lastActive = lastAccessDates[0];
        }

        return {
          id: user.id,
          name: user.profile.name,
          email: user.profile.email,
          avatar: user.profile.avatar,
          joinedAt: user.profile.joinedAt || user.createdAt || new Date().toISOString(),
          coursesEnrolled,
          coursesCompleted,
          webinarsRegistered,
          webinarsAttended,
          totalWatchTime,
          lastActive,
        };
      })
    );

    // Calculate summary statistics
    const totalUsers = expertUsers.length;
    const activeUsers = expertUsers.filter(
      u => u.lastActive && new Date(u.lastActive) >= thirtyDaysAgo
    ).length;
    const avgCoursesPerUser =
      totalUsers > 0
        ? Math.round(
            (expertUsers.reduce((sum, u) => sum + u.coursesEnrolled, 0) / totalUsers) * 10
          ) / 10
        : 0;
    const avgWebinarsPerUser =
      totalUsers > 0
        ? Math.round(
            (expertUsers.reduce((sum, u) => sum + u.webinarsRegistered, 0) / totalUsers) * 10
          ) / 10
        : 0;

    // Sort users by join date (most recent first)
    expertUsers.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());

    const responseData: ExpertUsersResponse = {
      users: expertUsers,
      total: totalUsers,
      summary: {
        totalUsers,
        activeUsers,
        avgCoursesPerUser,
        avgWebinarsPerUser,
      },
    };

    const response: ApiResponse<ExpertUsersResponse> = {
      success: true,
      data: responseData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][srv/expert-users] Error:', error);

    // Handle authorization errors
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 403 });
      }
    }

    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
