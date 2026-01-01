'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Email } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';

type FilterType = 'all' | 'unread' | 'starred';

export default function InboxPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastKey, setLastKey] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchEmails = useCallback(
    async (append = false) => {
      try {
        if (!append) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const queryParams = new URLSearchParams();
        queryParams.set('limit', '20');

        if (filter === 'unread') {
          queryParams.set('unreadOnly', 'true');
        } else if (filter === 'starred') {
          queryParams.set('starredOnly', 'true');
        }

        if (searchQuery) {
          queryParams.set('search', searchQuery);
        }

        if (append && lastKey) {
          queryParams.set('lastKey', lastKey);
        }

        console.log('[DBG][inbox] Fetching emails with params:', queryParams.toString());

        const response = await fetch(`/data/app/expert/me/inbox?${queryParams.toString()}`);
        const data = await response.json();

        if (data.success && data.data) {
          if (append) {
            setEmails(prev => [...prev, ...data.data.emails]);
          } else {
            setEmails(data.data.emails);
          }
          setUnreadCount(data.data.unreadCount || 0);
          setLastKey(data.data.lastKey);
          setHasMore(!!data.data.lastKey);
        } else {
          setError(data.error || 'Failed to load emails');
        }
      } catch (err) {
        console.error('[DBG][inbox] Error fetching emails:', err);
        setError('Failed to load emails');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, searchQuery, lastKey]
  );

  useEffect(() => {
    setLastKey(undefined);
    fetchEmails(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, searchQuery]);

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
        console.log('[DBG][inbox] Failed to mark as read:', err);
      }
    }
    router.push(`/srv/${expertId}/inbox/${email.id}`);
  };

  const handleToggleStar = async (e: React.MouseEvent, email: Email) => {
    e.stopPropagation();
    try {
      await fetch(`/data/app/expert/me/inbox/${email.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !email.isStarred }),
      });
      setEmails(prev =>
        prev.map(em => (em.id === email.id ? { ...em, isStarred: !em.isStarred } : em))
      );
    } catch (err) {
      console.log('[DBG][inbox] Failed to toggle star:', err);
    }
  };

  const formatDate = (dateString: string) => {
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

  return (
    <div className="px-6 lg:px-8 py-6">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" message="Loading inbox..." />
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400 text-xl">!</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Filter Tabs */}
                <div className="flex gap-2">
                  {(['all', 'unread', 'starred'] as FilterType[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        filter === f
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Starred'}
                      {f === 'unread' && unreadCount > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search emails..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
              </div>
            </div>

            {/* Email List */}
            <div className="divide-y divide-gray-100">
              {emails.length === 0 ? (
                <div className="p-12 text-center">
                  <svg
                    className="w-12 h-12 mx-auto text-gray-300 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-gray-500">
                    {filter === 'unread'
                      ? 'No unread emails'
                      : filter === 'starred'
                        ? 'No starred emails'
                        : 'No emails yet'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Emails sent to your @myyoga.guru address will appear here
                  </p>
                </div>
              ) : (
                emails.map(email => (
                  <div
                    key={email.id}
                    onClick={() => handleEmailClick(email)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !email.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Star Button */}
                      <button
                        onClick={e => handleToggleStar(e, email)}
                        className="flex-shrink-0 mt-0.5"
                      >
                        <svg
                          className={`w-5 h-5 ${
                            email.isStarred ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                          fill={email.isStarred ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>

                      {/* Email Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm truncate ${
                              !email.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'
                            }`}
                          >
                            {email.isOutgoing ? (
                              <>
                                <span className="text-gray-400">To: </span>
                                {email.to[0]?.name || email.to[0]?.email}
                              </>
                            ) : (
                              email.from.name || email.from.email
                            )}
                          </p>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatDate(email.receivedAt)}
                          </span>
                        </div>
                        <p
                          className={`text-sm mt-0.5 truncate ${
                            !email.isRead ? 'font-medium text-gray-800' : 'text-gray-600'
                          }`}
                        >
                          {email.subject || '(no subject)'}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">
                          {email.bodyText?.substring(0, 100) || '(no content)'}
                        </p>

                        {/* Attachments indicator */}
                        {email.attachments && email.attachments.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5">
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
                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                              />
                            </svg>
                            <span className="text-xs text-gray-500">
                              {email.attachments.length} attachment
                              {email.attachments.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => fetchEmails(true)}
                  disabled={loadingMore}
                  className="w-full py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
