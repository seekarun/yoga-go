import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Expert from '@/models/Expert';
import Course from '@/models/Course';
import type { AdminStats } from '@/types';

/**
 * GET /data/admn/stats
 * Get overall platform statistics for admin dashboard
 */
export async function GET() {
  try {
    // Require admin authentication
    await requireAdminAuth();

    console.log('[DBG][admn/stats] Fetching platform statistics');

    await connectToDatabase();

    // Get current date and date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Run queries in parallel for performance
    const [totalUsers, totalLearners, totalExperts, activeUsers, totalCourses, recentSignups] =
      await Promise.all([
        User.countDocuments({ role: { $ne: 'admin' } }), // Exclude admins from count
        User.countDocuments({ role: 'learner' }),
        User.countDocuments({ role: 'expert' }),
        User.countDocuments({
          role: { $ne: 'admin' },
          'statistics.lastPractice': { $gte: thirtyDaysAgo.toISOString() },
        }),
        Course.countDocuments({ status: 'PUBLISHED' }),
        User.countDocuments({
          role: { $ne: 'admin' },
          'profile.joinedAt': { $gte: sevenDaysAgo.toISOString() },
        }),
      ]);

    // Calculate total enrollments across all users
    const enrollmentResults = await User.aggregate([
      { $match: { role: { $ne: 'admin' } } },
      { $project: { enrollmentCount: { $size: '$enrolledCourses' } } },
      { $group: { _id: null, totalEnrollments: { $sum: '$enrollmentCount' } } },
    ]);

    const totalEnrollments = enrollmentResults[0]?.totalEnrollments || 0;

    // Calculate total revenue (sum of payment amounts)
    const revenueResults = await User.aggregate([
      { $match: { role: 'learner', 'billing.paymentHistory': { $exists: true, $ne: [] } } },
      { $unwind: '$billing.paymentHistory' },
      { $match: { 'billing.paymentHistory.status': 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$billing.paymentHistory.amount' } } },
    ]);

    const totalRevenue = revenueResults[0]?.totalRevenue || 0;

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
