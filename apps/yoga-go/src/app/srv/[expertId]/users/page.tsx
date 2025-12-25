'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

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
  totalWatchTime: number;
  lastActive?: string;
}

interface UsersSummary {
  totalUsers: number;
  activeUsers: number;
  avgCoursesPerUser: number;
  avgWebinarsPerUser: number;
}

interface UsersData {
  users: ExpertUser[];
  total: number;
  summary: UsersSummary;
}

export default function ExpertUsersPage() {
  const params = useParams();
  const expertId = params.expertId as string;
  const [usersData, setUsersData] = useState<UsersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'joinedAt' | 'lastActive' | 'coursesEnrolled' | 'watchTime'>(
    'joinedAt'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[DBG][expert-users] Fetching users for expert:', expertId);

      const response = await fetch(`/api/srv/experts/${expertId}/users`);
      const data = await response.json();

      if (data.success) {
        setUsersData(data.data);
        console.log('[DBG][expert-users] Users loaded:', data.data.total);
      } else {
        setError(data.error || 'Failed to load users');
      }
    } catch (err) {
      console.error('[DBG][expert-users] Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [expertId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (dateStr: string | undefined) => {
    if (!dateStr) return 'Never';

    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const formatWatchTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Filter and sort users
  const filteredUsers = usersData?.users
    .filter(
      user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'joinedAt':
          comparison = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
          break;
        case 'lastActive':
          const aDate = a.lastActive ? new Date(a.lastActive).getTime() : 0;
          const bDate = b.lastActive ? new Date(b.lastActive).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case 'coursesEnrolled':
          comparison = a.coursesEnrolled - b.coursesEnrolled;
          break;
        case 'watchTime':
          comparison = a.totalWatchTime - b.totalWatchTime;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ column }: { column: typeof sortBy }) => {
    if (sortBy !== column) {
      return (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return sortOrder === 'desc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" message="Loading users..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">!</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const summary = usersData?.summary;

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Users</h1>
              <p className="text-sm text-gray-500 mt-1">
                {usersData?.total || 0} users signed up via your space
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Users</p>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{summary?.totalUsers || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Signed up via your space</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Active Users</p>
              <span className="text-2xl">🟢</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{summary?.activeUsers || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Active in last 30 days</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Avg Courses</p>
              <span className="text-2xl">📚</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{summary?.avgCoursesPerUser || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Per user</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Avg Sessions</p>
              <span className="text-2xl">🎥</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{summary?.avgWebinarsPerUser || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Per user</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Showing {filteredUsers?.length || 0} of {usersData?.total || 0} users
              </p>
            </div>
          </div>

          {/* Users Table */}
          {filteredUsers && filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('joinedAt')}
                    >
                      <div className="flex items-center gap-1">
                        Joined
                        <SortIcon column="joinedAt" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('coursesEnrolled')}
                    >
                      <div className="flex items-center gap-1">
                        Courses
                        <SortIcon column="coursesEnrolled" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sessions
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('watchTime')}
                    >
                      <div className="flex items-center gap-1">
                        Watch Time
                        <SortIcon column="watchTime" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('lastActive')}
                    >
                      <div className="flex items-center gap-1">
                        Last Active
                        <SortIcon column="lastActive" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {user.avatar ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={user.avatar}
                                alt={user.name}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500 font-medium text-sm">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(user.joinedAt)}</div>
                        <div className="text-xs text-gray-500">
                          {formatRelativeTime(user.joinedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.coursesEnrolled} enrolled</div>
                        <div className="text-xs text-gray-500">
                          {user.coursesCompleted} completed
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.webinarsRegistered} registered
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.webinarsAttended} attended
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatWatchTime(user.totalWatchTime)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatRelativeTime(user.lastActive)}
                        </div>
                        {user.lastActive && (
                          <div className="text-xs text-gray-500">{formatDate(user.lastActive)}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No users found' : 'No users yet'}
              </h3>
              <p className="text-gray-600">
                {searchTerm
                  ? 'Try adjusting your search term'
                  : 'Users who sign up via your space will appear here'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
