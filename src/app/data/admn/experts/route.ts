import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import * as userRepository from '@/lib/repositories/userRepository';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
import type { ExpertListItem, User, Expert } from '@/types';

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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search')?.toLowerCase() || '';
    const status = searchParams.get('status') || '';
    const featured = searchParams.get('featured') || '';

    // Get all users from DynamoDB
    const allUsers = await userRepository.getAllUsers();

    // Filter for expert users
    let expertUsers = allUsers.filter((user: User) => user.role.includes('expert'));

    // Apply search filter (name or email)
    if (search) {
      expertUsers = expertUsers.filter(
        (user: User) =>
          user.profile.name?.toLowerCase().includes(search) ||
          user.profile.email?.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (status) {
      expertUsers = expertUsers.filter((user: User) => user.membership.status === status);
    }

    // Sort by joinedAt descending (newest first)
    expertUsers.sort((a: User, b: User) => {
      const dateA = new Date(a.profile.joinedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.profile.joinedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // Calculate pagination
    const total = expertUsers.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const paginatedUsers = expertUsers.slice(skip, skip + limit);

    // Get expert profile IDs
    const expertProfileIds = paginatedUsers
      .map((u: User) => u.expertProfile)
      .filter((id): id is string => id !== undefined);

    // Fetch expert profiles from DynamoDB
    const allExpertProfiles = await Promise.all(
      expertProfileIds.map(id => expertRepository.getExpertById(id))
    );

    // Filter out nulls and apply featured filter if requested
    let expertProfiles = allExpertProfiles.filter((e): e is Expert => e !== null);
    if (featured) {
      expertProfiles = expertProfiles.filter(e => e.featured === (featured === 'true'));
    }

    // Create a map of expertId -> expert profile
    const expertProfileMap = new Map(expertProfiles.map(e => [e.id, e]));

    // Get course counts and student counts for each expert from DynamoDB
    const publishedCourses = await courseRepository.getCoursesByStatus('PUBLISHED');

    // Aggregate course counts by instructor
    const courseCountMap = new Map<string, { totalCourses: number; totalStudents: number }>();
    for (const course of publishedCourses) {
      const instructorId = course.instructor?.id;
      if (instructorId && expertProfileIds.includes(instructorId)) {
        const current = courseCountMap.get(instructorId) || { totalCourses: 0, totalStudents: 0 };
        courseCountMap.set(instructorId, {
          totalCourses: current.totalCourses + 1,
          totalStudents: current.totalStudents + (course.totalStudents || 0),
        });
      }
    }

    // Transform to ExpertListItem format
    const expertList = paginatedUsers
      .map((user: User): ExpertListItem | null => {
        const expertProfile = expertProfileMap.get(user.expertProfile || '');
        if (!expertProfile) return null;

        const courseStats = courseCountMap.get(expertProfile.id) || {
          totalCourses: 0,
          totalStudents: 0,
        };

        return {
          id: user.id,
          name: user.profile.name,
          email: user.profile.email,
          avatar: user.profile.avatar || expertProfile.avatar,
          expertId: expertProfile.id,
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
