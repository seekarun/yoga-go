'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@/types';

interface AnalyticsData {
  expertId: string;
  period: string;
  overview: {
    totalCourses: number;
    publishedCourses: number;
    totalViews: number;
    uniqueViewers: number;
    enrollClicks: number;
    totalEnrollments: number;
    totalRevenue: number;
    currency: string;
  };
  conversion: {
    avgConversionRate: number;
    avgClickToPaymentRate: number;
    avgPaymentSuccessRate: number;
  };
  engagement: {
    totalWatchTimeMinutes: number;
    avgCompletionRate: number;
  };
  topPerformingCourses: Array<{
    courseId: string;
    title: string;
    views: number;
    enrollClicks: number;
    enrollments: number;
    revenue: number;
  }>;
}

export default function AnalyticsDashboard() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Check authorization first
  useEffect(() => {
    checkAuthorization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId]);

  useEffect(() => {
    if (!authChecking) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId, period, authChecking]);

  const checkAuthorization = async () => {
    try {
      console.log('[DBG][analytics-dashboard] Checking authorization for expertId:', expertId);

      // Fetch current user
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (!data.success || !data.data) {
        console.log('[DBG][analytics-dashboard] Not authenticated, redirecting to login');
        router.push('/');
        return;
      }

      const user: User = data.data;

      // Check if user is an expert (role is now an array)
      const isExpert = Array.isArray(user.role)
        ? user.role.includes('expert')
        : user.role === 'expert';
      if (!isExpert) {
        console.log('[DBG][analytics-dashboard] User is not an expert, redirecting to home');
        router.push('/');
        return;
      }

      // Check if expert profile is set up
      if (!user.expertProfile) {
        console.log(
          '[DBG][analytics-dashboard] Expert profile not set up yet, redirecting to onboarding'
        );
        router.push('/srv');
        return;
      }

      // Check if user owns this expert profile
      if (user.expertProfile !== expertId) {
        console.log(
          `[DBG][analytics-dashboard] User doesn't own this profile. user.expertProfile=${user.expertProfile}, requested=${expertId}`
        );
        console.log('[DBG][analytics-dashboard] Redirecting to own dashboard:', user.expertProfile);
        router.push(`/srv/${user.expertProfile}`);
        return;
      }

      console.log('[DBG][analytics-dashboard] Authorization check passed');
      setAuthChecking(false);
    } catch (err) {
      console.error('[DBG][analytics-dashboard] Error checking authorization:', err);
      router.push('/');
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      console.log('[DBG][analytics-dashboard] Fetching analytics for expert:', expertId, period);

      const response = await fetch(`/api/srv/experts/${expertId}/analytics?period=${period}`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
        console.log('[DBG][analytics-dashboard] Analytics loaded:', data.data);
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch (err) {
      console.error('[DBG][analytics-dashboard] Error fetching analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100); // Convert from cents
  };

  if (authChecking || loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">
            {authChecking ? 'Verifying access...' : 'Loading analytics...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error || 'Failed to load analytics'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/srv" className="text-blue-600 hover:text-blue-700 text-sm mb-3 inline-block">
            ← Back
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Course Analytics</h1>
              <p className="text-gray-600 mt-1">Track your course performance and engagement</p>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2">
              {(['7d', '30d', '90d', 'all'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p === 'all'
                    ? 'All Time'
                    : p === '7d'
                      ? '7 Days'
                      : p === '30d'
                        ? '30 Days'
                        : '90 Days'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Views</p>
              <span className="text-2xl">👁️</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {analytics.overview.totalViews.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {analytics.overview.uniqueViewers.toLocaleString()} unique viewers
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Enrollments</p>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {analytics.overview.totalEnrollments.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              From {analytics.overview.enrollClicks} clicks
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(analytics.overview.totalRevenue, analytics.overview.currency)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Across {analytics.overview.totalCourses} courses
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Conversion Rate</p>
              <span className="text-2xl">📈</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {analytics.conversion.avgConversionRate}%
            </p>
            <p className="text-sm text-gray-500 mt-1">Click to enrollment</p>
          </div>
        </div>

        {/* Conversion Metrics */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Conversion Funnel</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Click → Payment</p>
                  <span className="text-lg font-bold text-blue-600">
                    {analytics.conversion.avgClickToPaymentRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{
                      width: `${Math.min(analytics.conversion.avgClickToPaymentRate, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Users who initiated payment</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Payment Success</p>
                  <span className="text-lg font-bold text-green-600">
                    {analytics.conversion.avgPaymentSuccessRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-green-600 h-2.5 rounded-full"
                    style={{
                      width: `${Math.min(analytics.conversion.avgPaymentSuccessRate, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Payments that succeeded</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Overall Conversion</p>
                  <span className="text-lg font-bold text-purple-600">
                    {analytics.conversion.avgConversionRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-purple-600 h-2.5 rounded-full"
                    style={{ width: `${Math.min(analytics.conversion.avgConversionRate, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Click to enrollment rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Watch Time</h3>
            <div className="flex items-center gap-4">
              <span className="text-5xl">⏱️</span>
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {Math.floor(analytics.engagement.totalWatchTimeMinutes / 60)}h{' '}
                  {analytics.engagement.totalWatchTimeMinutes % 60}m
                </p>
                <p className="text-sm text-gray-500">Total watch time</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Course Completion</h3>
            <div className="flex items-center gap-4">
              <span className="text-5xl">🎓</span>
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.engagement.avgCompletionRate}%
                </p>
                <p className="text-sm text-gray-500">Average completion rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Courses */}
        {analytics.topPerformingCourses.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Top Performing Courses</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clicks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enrollments
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.topPerformingCourses.map(course => (
                    <tr key={course.courseId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/srv/${expertId}/courses/${course.courseId}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {course.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {course.views.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {course.enrollClicks.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {course.enrollments.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatCurrency(course.revenue, analytics.overview.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {analytics.topPerformingCourses.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Yet</h3>
            <p className="text-gray-600 mb-4">
              Analytics data will appear here once your courses start receiving views and
              enrollments.
            </p>
            <Link
              href={`/srv/${expertId}`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
