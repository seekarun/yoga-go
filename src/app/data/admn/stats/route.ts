import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import * as userRepository from '@/lib/repositories/userRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
import type { AdminStats, User } from '@/types';

/**
 * GET /data/admn/stats
 * Get overall platform statistics for admin dashboard
 */
export async function GET() {
  try {
    // Require admin authentication
    await requireAdminAuth();

    console.log('[DBG][admn/stats] Fetching platform statistics');

    // Get current date and date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all users from DynamoDB
    const allUsers = await userRepository.getAllUsers();

    // Filter out admins
    const nonAdminUsers = allUsers.filter((user: User) => !user.role.includes('admin'));

    // Calculate user counts
    const totalUsers = nonAdminUsers.length;
    const totalLearners = nonAdminUsers.filter((user: User) =>
      user.role.includes('learner')
    ).length;
    const totalExperts = nonAdminUsers.filter((user: User) => user.role.includes('expert')).length;

    // Active users (practiced in last 30 days)
    const activeUsers = nonAdminUsers.filter((user: User) => {
      if (!user.statistics?.lastPractice) return false;
      return new Date(user.statistics.lastPractice) >= thirtyDaysAgo;
    }).length;

    // Recent signups (last 7 days)
    const recentSignups = nonAdminUsers.filter((user: User) => {
      const joinedAt = user.profile?.joinedAt || user.createdAt;
      if (!joinedAt) return false;
      return new Date(joinedAt) >= sevenDaysAgo;
    }).length;

    // Calculate total enrollments
    const totalEnrollments = nonAdminUsers.reduce((total: number, user: User) => {
      return total + (user.enrolledCourses?.length || 0);
    }, 0);

    // Calculate total revenue from payment history
    const totalRevenue = nonAdminUsers.reduce((total: number, user: User) => {
      if (!user.billing?.paymentHistory) return total;
      return (
        total +
        user.billing.paymentHistory
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0)
      );
    }, 0);

    // Get course count from DynamoDB
    const publishedCourses = await courseRepository.getCoursesByStatus('PUBLISHED');
    const totalCourses = publishedCourses.length;

    const stats: AdminStats = {
      totalUsers,
      totalLearners,
      totalExperts,
      activeUsers,
      totalCourses,
      totalEnrollments,
      totalRevenue,
      recentSignups,
    };

    console.log('[DBG][admn/stats] Stats calculated:', stats);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[DBG][admn/stats] Error fetching stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
      },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}
