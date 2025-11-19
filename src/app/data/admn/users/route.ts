import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import type { UserListItem } from '@/types';

/**
 * GET /data/admn/users
 * Get paginated list of all learners
 * Query params: page, limit, search, membershipType, status
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdminAuth();

    console.log('[DBG][admn/users] Fetching users list');

    await connectToDatabase();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const membershipType = searchParams.get('membershipType') || '';
    const status = searchParams.get('status') || '';

    // Build query filter
    const query: any = { role: 'learner' };

    // Add search filter (name or email)
    if (search) {
      query.$or = [
        { 'profile.name': { $regex: search, $options: 'i' } },
        { 'profile.email': { $regex: search, $options: 'i' } },
      ];
    }

    // Add membership type filter
    if (membershipType) {
      query['membership.type'] = membershipType;
    }

    // Add status filter
    if (status) {
      query['membership.status'] = status;
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get total count and paginated data
    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('_id profile membership statistics enrolledCourses billing createdAt')
        .sort({ 'profile.joinedAt': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Transform to UserListItem format
    const userList: UserListItem[] = users.map(user => {
      // Calculate total spent from payment history
      const totalSpent =
        user.billing?.paymentHistory
          ?.filter((p: any) => p.status === 'paid')
          .reduce((sum: number, p: any) => sum + p.amount, 0) || 0;

      return {
        id: user._id as string,
        name: user.profile.name,
        email: user.profile.email,
        avatar: user.profile.avatar,
        role: 'learner',
        membershipType: user.membership.type,
        membershipStatus: user.membership.status,
        joinedAt: user.profile.joinedAt,
        lastActive: user.statistics.lastPractice,
        totalCourses: user.enrolledCourses?.length || 0,
        totalSpent,
        status: user.membership.status === 'active' ? 'active' : 'suspended',
      };
    });

    const totalPages = Math.ceil(total / limit);

    console.log('[DBG][admn/users] Found', total, 'users, page', page, 'of', totalPages);

    return NextResponse.json({
      success: true,
      data: userList,
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
    console.error('[DBG][admn/users] Error fetching users:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users',
      },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}
