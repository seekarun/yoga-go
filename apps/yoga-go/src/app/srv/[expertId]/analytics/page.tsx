'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

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
  const expertId = params.expertId as string;
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId, period]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" message="Loading analytics..." />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error || 'Failed to load analytics'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-8 py-6">
      {/* Period Selector */}
      <div className="flex justify-end mb-6">
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
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Views</p>
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
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
            <svg
              className="w-6 h-6 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
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
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
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
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
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
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
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
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l9-5-9-5-9 5 9 5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
                />
              </svg>
            </div>
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
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Yet</h3>
          <p className="text-gray-600 mb-4">
            Analytics data will appear here once your courses start receiving views and enrollments.
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
  );
}
