import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Expert from '@/models/Expert';
import Course from '@/models/Course';
import type { ExpertListItem } from '@/types';

/**
 * GET /data/admn/experts
 * Get paginated list of all experts
 * Query params: page, limit, search, status, featured
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdminAuth();

    console.log('[DBG][admn/experts] Fetching experts list');

    await connectToDatabase();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const featured = searchParams.get('featured') || '';

    // Build query filter for User model
    const userQuery: any = { role: 'expert' };

    // Add search filter (name or email)
    if (search) {
      userQuery.$or = [
        { 'profile.name': { $regex: search, $options: 'i' } },
        { 'profile.email': { $regex: search, $options: 'i' } },
      ];
    }

    // Add status filter
    if (status) {
      userQuery['membership.status'] = status;
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get total count and paginated expert users
    const [total, expertUsers] = await Promise.all([
      User.countDocuments(userQuery),
      User.find(userQuery)
        .select('_id profile membership statistics expertProfile createdAt')
        .sort({ 'profile.joinedAt': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Get expert profile IDs
    const expertProfileIds = expertUsers
      .map(u => u.expertProfile)
      .filter((id): id is string => id !== undefined);

    // Fetch expert profiles
    const expertProfileQuery: any = { _id: { $in: expertProfileIds } };
    if (featured) {
      expertProfileQuery.featured = featured === 'true';
    }

    const expertProfiles = await Expert.find(expertProfileQuery).lean();

    // Create a map of expertId -> expert profile
    const expertProfileMap = new Map(expertProfiles.map(e => [e._id, e]));

    // Get course counts and student counts for each expert
    const courseCounts = await Course.aggregate([
      {
        $match: {
          'instructor.id': { $in: expertProfileIds },
          status: 'PUBLISHED',
        },
      },
      {
        $group: {
          _id: '$instructor.id',
          totalCourses: { $sum: 1 },
          totalStudents: { $sum: '$totalStudents' },
        },
      },
    ]);

    const courseCountMap = new Map(
      courseCounts.map(c => [
        c._id,
        { totalCourses: c.totalCourses, totalStudents: c.totalStudents },
      ])
    );

    // Transform to ExpertListItem format
    const expertList = expertUsers
      .map((user): ExpertListItem | null => {
        const expertProfile = expertProfileMap.get(user.expertProfile || '');
        if (!expertProfile) return null;

        const courseStats = courseCountMap.get(expertProfile._id) || {
          totalCourses: 0,
          totalStudents: 0,
        };

        return {
          id: user._id as string,
          name: user.profile.name,
          email: user.profile.email,
          avatar: user.profile.avatar || expertProfile.avatar,
          expertId: expertProfile._id as string,
          joinedAt: user.profile.joinedAt,
          lastActive: user.statistics.lastPractice,
          totalCourses: courseStats.totalCourses,
          totalStudents: courseStats.totalStudents,
          totalRevenue: 0, // TODO: Calculate from payment records
          featured: expertProfile.featured || false,
          status: user.membership.status === 'active' ? 'active' : 'suspended',
        };
      })
      .filter((item): item is ExpertListItem => item !== null);

    const totalPages = Math.ceil(total / limit);

    console.log(
      '[DBG][admn/experts] Found',
      expertList.length,
      'experts, page',
      page,
      'of',
      totalPages
    );

    return NextResponse.json({
      success: true,
      data: expertList,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    });
  } catch (error) {
    console.error('[DBG][admn/experts] Error fetching experts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch experts',
      },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}
