import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import * as userRepository from '@/lib/repositories/userRepository';
import type { UserListItem, User } from '@/types';

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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search')?.toLowerCase() || '';
    const membershipType = searchParams.get('membershipType') || '';
    const status = searchParams.get('status') || '';

    // Get all users from DynamoDB
    const allUsers = await userRepository.getAllUsers();

    // Filter for learners with role array
    let filteredUsers = allUsers.filter((user: User) =>
      Array.isArray(user.role) ? user.role.includes('learner') : user.role === 'learner'
    );

    // Apply search filter (name or email)
    if (search) {
      filteredUsers = filteredUsers.filter(
        (user: User) =>
          user.profile.name?.toLowerCase().includes(search) ||
          user.profile.email?.toLowerCase().includes(search)
      );
    }

    // Apply membership type filter
    if (membershipType) {
      filteredUsers = filteredUsers.filter((user: User) => user.membership.type === membershipType);
    }

    // Apply status filter
    if (status) {
      filteredUsers = filteredUsers.filter((user: User) => user.membership.status === status);
    }

    // Sort by joinedAt descending (newest first)
    filteredUsers.sort((a: User, b: User) => {
      const dateA = new Date(a.profile.joinedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.profile.joinedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // Calculate pagination
    const total = filteredUsers.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(skip, skip + limit);

    // Transform to UserListItem format
    const userList: UserListItem[] = paginatedUsers.map((user: User) => {
      // Calculate total spent from payment history
      const totalSpent =
        user.billing?.paymentHistory
          ?.filter(p => p.status === 'paid')
          .reduce((sum: number, p) => sum + p.amount, 0) || 0;

      return {
        id: user.id,
        name: user.profile.name,
        email: user.profile.email,
        avatar: user.profile.avatar,
        role: ['learner'] as const,
        membershipType: user.membership.type,
        membershipStatus: user.membership.status,
        joinedAt: user.profile.joinedAt,
        lastActive: user.statistics.lastPractice,
        totalCourses: user.enrolledCourses?.length || 0,
        totalSpent,
        status: user.membership.status === 'active' ? 'active' : 'suspended',
      };
    });

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
