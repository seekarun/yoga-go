'use client';

import LoadingSpinner from '@/components/LoadingSpinner';
import { formatPrice } from '@/lib/currency/currencyService';
import type { Course, Email, SupportedCurrency } from '@/types';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface StripeBalanceData {
  connected: boolean;
  active?: boolean;
  status?: string;
  balance?: {
    available: { amount: number; currency: string }[];
    pending: { amount: number; currency: string }[];
  };
}

export default function ExpertDashboard() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeBalance, setStripeBalance] = useState<StripeBalanceData | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  // Inbox state
  const [emails, setEmails] = useState<Email[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [emailsLastKey, setEmailsLastKey] = useState<string | undefined>(undefined);
  const [emailsHasMore, setEmailsHasMore] = useState(false);
  const [loadingMoreEmails, setLoadingMoreEmails] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  const fetchEmails = useCallback(async (append = false, lastKey?: string) => {
    try {
      if (!append) {
        setLoadingEmails(true);
      } else {
        setLoadingMoreEmails(true);
      }

      const queryParams = new URLSearchParams();
      queryParams.set('limit', '20');

      if (lastKey) {
        queryParams.set('lastKey', lastKey);
      }

      console.log('[DBG][expert-dashboard] Fetching emails');

      const response = await fetch(`/data/app/expert/me/inbox?${queryParams.toString()}`);
      const data = await response.json();

      if (data.success && data.data) {
        if (append) {
          setEmails(prev => [...prev, ...data.data.emails]);
        } else {
          setEmails(data.data.emails);
        }
        setUnreadCount(data.data.unreadCount || 0);
        setEmailsLastKey(data.data.lastKey);
        setEmailsHasMore(!!data.data.lastKey);
      }
    } catch (err) {
      console.error('[DBG][expert-dashboard] Error fetching emails:', err);
    } finally {
      setLoadingEmails(false);
      setLoadingMoreEmails(false);
    }
  }, []);

  const handleEmailClick = async (email: Email) => {
    // Mark as read if not already read
    if (!email.isRead) {
      try {
        await fetch(`/data/app/expert/me/inbox/${email.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        });
        setEmails(prev => prev.map(e => (e.id === email.id ? { ...e, isRead: true } : e)));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.log('[DBG][expert-dashboard] Failed to mark as read:', err);
      }
    }
    router.push(`/srv/${expertId}/inbox/${email.id}`);
  };

  const formatEmailDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  useEffect(() => {
    fetchExpertCourses();
    fetchStripeBalance();
    fetchEmails();
  }, [fetchExpertCourses, fetchStripeBalance, fetchEmails]);

  // Format currency amount (from cents to dollars)
  const formatAmount = (amount: number, currency: string) => {
    return formatPrice(amount / 100, currency as SupportedCurrency);
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

  // Open Stripe dashboard in new tab
  const openStripeDashboard = async () => {
    try {
      const response = await fetch('/api/stripe/connect/dashboard', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success && data.data?.url) {
        window.open(data.data.url, '_blank', 'noopener,noreferrer');
      } else {
        console.error('[DBG][expert-dashboard] Failed to get Stripe dashboard URL:', data.error);
      }
    } catch (err) {
      console.error('[DBG][expert-dashboard] Error opening Stripe dashboard:', err);
    }
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
                <button
                  onClick={openStripeDashboard}
                  className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                >
                  Go to Stripe Dashboard →
                </button>
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

        {/* Quick Actions */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href={`/srv/${expertId}/courses`}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, white)' }}
              >
                <svg
                  className="w-6 h-6"
                  style={{ color: 'var(--color-primary)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-blue-600">Courses</p>
                <p className="text-sm text-gray-500">Manage your courses</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/srv/${expertId}/analytics`}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, white)' }}
              >
                <svg
                  className="w-6 h-6"
                  style={{ color: 'var(--color-primary)' }}
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
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-blue-600">Analytics</p>
                <p className="text-sm text-gray-500">View performance data</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/srv/${expertId}/webinars`}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, white)' }}
              >
                <svg
                  className="w-6 h-6"
                  style={{ color: 'var(--color-primary)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-blue-600">
                  Live Sessions
                </p>
                <p className="text-sm text-gray-500">Manage webinars</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/srv/${expertId}/landing-page`}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, white)' }}
              >
                <svg
                  className="w-6 h-6"
                  style={{ color: 'var(--color-primary)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-blue-600">
                  Landing Page
                </p>
                <p className="text-sm text-gray-500">Customize your page</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Inbox Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">Inbox</h2>
              {unreadCount > 0 && (
                <span
                  className="px-2.5 py-0.5 text-xs font-medium text-white rounded-full"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>
            <Link
              href={`/srv/${expertId}/inbox`}
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--color-primary)' }}
            >
              View all →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loadingEmails ? (
              <div className="p-8 text-center">
                <LoadingSpinner size="md" message="Loading emails..." />
              </div>
            ) : emails.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-500">No emails yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Messages from students will appear here
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100">
                  {emails.map(email => (
                    <button
                      key={email.id}
                      onClick={() => handleEmailClick(email)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        !email.isRead ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Unread indicator */}
                        <div className="flex-shrink-0 pt-2">
                          {!email.isRead ? (
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ background: 'var(--color-primary)' }}
                            />
                          ) : (
                            <div className="w-2 h-2" />
                          )}
                        </div>

                        {/* Email content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span
                              className={`text-sm truncate ${
                                !email.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'
                              }`}
                            >
                              {email.from.name || email.from.email}
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {formatEmailDate(email.receivedAt)}
                            </span>
                          </div>
                          <p
                            className={`text-sm truncate ${
                              !email.isRead ? 'font-medium text-gray-800' : 'text-gray-600'
                            }`}
                          >
                            {email.subject}
                          </p>
                          {email.bodyText && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {email.bodyText.slice(0, 80)}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Load more button */}
                {emailsHasMore && (
                  <div className="p-3 border-t border-gray-100">
                    <button
                      onClick={() => fetchEmails(true, emailsLastKey)}
                      disabled={loadingMoreEmails}
                      className="w-full py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loadingMoreEmails ? 'Loading...' : 'Load more emails'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
