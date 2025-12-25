'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Course } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';

interface StripeBalanceData {
  connected: boolean;
  active?: boolean;
  status?: string;
  balance?: {
    available: { amount: number; currency: string }[];
    pending: { amount: number; currency: string }[];
  };
}

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

export default function ExpertDashboard() {
  const params = useParams();
  const expertId = params.expertId as string;
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeBalance, setStripeBalance] = useState<StripeBalanceData | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const fetchExpertCourses = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[DBG][expert-dashboard] Fetching courses for expert:', expertId);

      // Fetch all courses for this instructor (both IN_PROGRESS and PUBLISHED)
      const response = await fetch(`/data/courses?instructorId=${expertId}&includeAll=true`);
      const data = await response.json();

      if (data.success) {
        setCourses(data.data || []);
        console.log('[DBG][expert-dashboard] Courses loaded:', data.data);
      } else {
        setError('Failed to load courses');
      }
    } catch (err) {
      console.error('[DBG][expert-dashboard] Error fetching courses:', err);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [expertId]);

  const fetchStripeBalance = useCallback(async () => {
    try {
      setLoadingBalance(true);
      console.log('[DBG][expert-dashboard] Fetching Stripe balance');

      const response = await fetch('/api/stripe/connect/balance');
      const data = await response.json();

      if (data.success) {
        setStripeBalance(data.data);
        console.log('[DBG][expert-dashboard] Stripe balance loaded:', data.data);
      }
    } catch (err) {
      console.error('[DBG][expert-dashboard] Error fetching Stripe balance:', err);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoadingAnalytics(true);
      console.log('[DBG][expert-dashboard] Fetching analytics:', expertId, period);

      const response = await fetch(`/api/srv/experts/${expertId}/analytics?period=${period}`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
        console.log('[DBG][expert-dashboard] Analytics loaded:', data.data);
      }
    } catch (err) {
      console.error('[DBG][expert-dashboard] Error fetching analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [expertId, period]);

  useEffect(() => {
    fetchExpertCourses();
    fetchStripeBalance();
  }, [fetchExpertCourses, fetchStripeBalance]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Format currency amount (from cents to dollars)
  const formatAmount = (amount: number, currency: string) => {
    const currencySymbols: Record<string, string> = {
      USD: '$',
      AUD: 'A$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
    };
    const symbol = currencySymbols[currency] || currency + ' ';
    return `${symbol}${(amount / 100).toFixed(2)}`;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  // Get total available and pending amounts
  const getEarningsSummary = () => {
    if (!stripeBalance?.balance) return null;

    const available = stripeBalance.balance.available[0] || { amount: 0, currency: 'USD' };
    const pending = stripeBalance.balance.pending[0] || { amount: 0, currency: 'USD' };

    return {
      available: formatAmount(available.amount, available.currency),
      pending: formatAmount(pending.amount, pending.currency),
      currency: available.currency,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" message="Loading dashboard..." />
      </div>
    );
  }

  // Calculate statistics from courses
  const publishedCourses = courses.filter(c => c.status === 'PUBLISHED');
  const totalStudents = courses.reduce((sum, c) => sum + (c.totalStudents || 0), 0);
  const earnings = getEarningsSummary();

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <Link
              href={`/srv/${expertId}/courses/create`}
              className="px-4 py-2 text-white text-sm rounded-lg transition-colors font-medium inline-flex items-center"
              style={{ background: 'var(--color-primary)' }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Course
            </Link>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Earnings Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Earnings</p>
              <span className="text-2xl">💰</span>
            </div>
            {loadingBalance ? (
              <div className="animate-pulse">
                <div className="h-9 bg-gray-200 rounded w-24 mb-1" />
                <div className="h-4 bg-gray-100 rounded w-32" />
              </div>
            ) : stripeBalance?.connected && stripeBalance?.active && earnings ? (
              <>
                <p className="text-3xl font-bold text-gray-900">{earnings.available}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {earnings.pending !== '$0.00' && `${earnings.pending} pending`}
                  {earnings.pending === '$0.00' && 'Available balance'}
                </p>
                <a
                  href="/api/stripe/connect/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                >
                  View Stripe Dashboard →
                </a>
              </>
            ) : stripeBalance?.connected && !stripeBalance?.active ? (
              <>
                <p className="text-lg font-medium text-amber-600">Setup incomplete</p>
                <Link
                  href={`/srv/${expertId}/settings`}
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                >
                  Complete Stripe setup →
                </Link>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-400">Not connected</p>
                <Link
                  href={`/srv/${expertId}/settings`}
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                >
                  Connect Stripe →
                </Link>
              </>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Students</p>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalStudents.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Across all courses</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Published Courses</p>
              <span className="text-2xl">📚</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{publishedCourses.length}</p>
            <p className="text-sm text-gray-500 mt-1">Live courses</p>
          </div>
        </div>

        {/* Analytics Section Header with Period Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
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

        {loadingAnalytics ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="md" message="Loading analytics..." />
          </div>
        ) : analytics ? (
          <>
            {/* Analytics Overview Cards */}
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
                  <span className="text-2xl">💵</span>
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
                <h3 className="text-lg font-bold text-gray-900">Conversion Funnel</h3>
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
                        style={{
                          width: `${Math.min(analytics.conversion.avgConversionRate, 100)}%`,
                        }}
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
                  <h3 className="text-lg font-bold text-gray-900">Top Performing Courses</h3>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Data Yet</h3>
                <p className="text-gray-600 mb-4">
                  Analytics data will appear here once your courses start receiving views and
                  enrollments.
                </p>
                <Link
                  href={`/srv/${expertId}/courses`}
                  className="inline-flex items-center px-6 py-3 text-white font-semibold rounded-lg transition-colors"
                  style={{ background: 'var(--color-primary)' }}
                >
                  View My Courses
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Unavailable</h3>
            <p className="text-gray-600">Unable to load analytics data at this time.</p>
          </div>
        )}
      </div>
    </>
  );
}
