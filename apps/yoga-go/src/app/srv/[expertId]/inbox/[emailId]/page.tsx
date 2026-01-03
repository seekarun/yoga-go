'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DOMPurify from 'dompurify';
import type { EmailAttachment, EmailWithThread } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useNotificationContextOptional as useNotificationContext } from '@/contexts/NotificationContext';

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const emailId = params.emailId as string;

  const [email, setEmail] = useState<EmailWithThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reply state
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Use notification context to mark email notification as read (optional during initial load)
  const notificationContext = useNotificationContext();
  const hasMarkedNotificationRef = useRef(false);

  // Mark the notification for this email as read
  useEffect(() => {
    if (hasMarkedNotificationRef.current || !emailId || !notificationContext) return;

    const { notifications, markAsRead } = notificationContext;

    // Find the notification for this email
    const emailNotification = notifications.find(
      n =>
        n.type === 'email_received' &&
        (n.metadata as { emailId?: string })?.emailId === emailId &&
        !n.isRead
    );

    if (emailNotification) {
      hasMarkedNotificationRef.current = true;
      markAsRead(emailNotification.id);
    }
  }, [emailId, notificationContext]);

  const fetchEmail = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[DBG][email-detail] Fetching email:', emailId);

      const response = await fetch(`/data/app/expert/me/inbox/${emailId}`);
      const data = await response.json();

      if (data.success && data.data) {
        setEmail(data.data);
        // Mark as read
        if (!data.data.isRead) {
          fetch(`/data/app/expert/me/inbox/${emailId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true }),
          });
        }
      } else {
        setError(data.error || 'Failed to load email');
      }
    } catch (err) {
      console.error('[DBG][email-detail] Error:', err);
      setError('Failed to load email');
    } finally {
      setLoading(false);
    }
  }, [emailId]);

  useEffect(() => {
    fetchEmail();
  }, [fetchEmail]);

  const handleDownloadAttachment = async (attachment: EmailAttachment) => {
    try {
      const response = await fetch(
        `/data/app/expert/me/inbox/${emailId}/attachments/${attachment.id}`
      );
      const data = await response.json();

      if (data.success && data.data?.downloadUrl) {
        window.open(data.data.downloadUrl, '_blank');
      } else {
        alert('Failed to get download link');
      }
    } catch (err) {
      console.error('[DBG][email-detail] Download error:', err);
      alert('Failed to download attachment');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this email?')) {
      return;
    }
    try {
      const response = await fetch(`/data/app/expert/me/inbox/${emailId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        router.push(`/srv/${expertId}/inbox`);
      } else {
        alert(data.error || 'Failed to delete email');
      }
    } catch (err) {
      console.error('[DBG][email-detail] Delete error:', err);
      alert('Failed to delete email');
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      setSendError('Please enter a reply message');
      return;
    }

    try {
      setSending(true);
      setSendError(null);

      const response = await fetch(`/data/app/expert/me/inbox/${emailId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: replyText,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSendSuccess(true);
        setReplyText('');
        setShowReply(false);
        // Refresh email to show in thread
        fetchEmail();
      } else {
        setSendError(data.error || 'Failed to send reply');
      }
    } catch (err) {
      console.error('[DBG][email-detail] Reply error:', err);
      setSendError('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" message="Loading email..." />
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || 'Email not found'}</p>
          <Link
            href={`/srv/${expertId}/inbox`}
            className="inline-block mt-4 text-sm text-blue-600 hover:underline"
          >
            Back to Inbox
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Link
                href={`/srv/${expertId}/inbox`}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {email.subject || '(no subject)'}
              </h1>
            </div>
            <button
              onClick={handleDelete}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              title="Delete email"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-6">
        {/* Success message */}
        {sendSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-700">Reply sent successfully!</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {/* Thread Messages or Single Email */}
          {email.threadMessages && email.threadMessages.length > 1 ? (
            // Thread view - show all messages
            <div className="divide-y divide-gray-100">
              {email.threadMessages.map(msg => (
                <div key={msg.id} className={`p-6 ${msg.isOutgoing ? 'bg-blue-50/50' : ''}`}>
                  {/* Message Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          msg.isOutgoing ? 'bg-blue-200' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`text-lg font-semibold ${
                            msg.isOutgoing ? 'text-blue-600' : 'text-gray-600'
                          }`}
                        >
                          {(msg.from.name || msg.from.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {msg.isOutgoing ? (
                            <span className="text-blue-600">You</span>
                          ) : (
                            msg.from.name || msg.from.email
                          )}
                          {msg.isOutgoing && (
                            <span className="text-gray-500 font-normal">
                              {' '}
                              to {msg.to[0]?.name || msg.to[0]?.email}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(msg.receivedAt)}</p>
                      </div>
                    </div>
                    {msg.isOutgoing && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded">
                        Sent
                      </span>
                    )}
                  </div>

                  {/* Message Body */}
                  <div className="ml-13">
                    {msg.bodyHtml ? (
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(msg.bodyHtml, {
                            ADD_TAGS: ['style'],
                            ADD_ATTR: ['target'],
                          }),
                        }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap text-gray-700">{msg.bodyText}</div>
                    )}
                  </div>

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-4 ml-13">
                      <div className="flex flex-wrap gap-2">
                        {msg.attachments.map(attachment => (
                          <button
                            key={attachment.id}
                            onClick={() => handleDownloadAttachment(attachment)}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left text-sm"
                          >
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
                            <span className="truncate max-w-32">{attachment.filename}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Single email view (no thread)
            <>
              {/* Email Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-lg font-semibold text-gray-600">
                          {(email.from.name || email.from.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {email.isOutgoing ? (
                            <>To: {email.to[0]?.name || email.to[0]?.email}</>
                          ) : (
                            email.from.name || email.from.email
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {email.isOutgoing ? `From: ${email.from.email}` : email.from.email}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{formatDate(email.receivedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Email Body */}
              <div className="p-6">
                {email.bodyHtml ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(email.bodyHtml, {
                        ADD_TAGS: ['style'],
                        ADD_ATTR: ['target'],
                      }),
                    }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-gray-700">{email.bodyText}</div>
                )}
              </div>

              {/* Attachments */}
              {email.attachments && email.attachments.length > 0 && (
                <div className="px-6 pb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Attachments ({email.attachments.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {email.attachments.map(attachment => (
                      <button
                        key={attachment.id}
                        onClick={() => handleDownloadAttachment(attachment)}
                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-5 h-5 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {attachment.filename}
                          </p>
                          <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                        </div>
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
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Reply Button - Show for threads and non-outgoing single emails */}
          {!showReply && !email.isOutgoing && (
            <div className="border-t border-gray-200 p-4">
              <button
                onClick={() => setShowReply(true)}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ background: 'var(--color-primary)' }}
              >
                Reply
              </button>
            </div>
          )}

          {/* Reply Form */}
          {showReply && (
            <div className="border-t border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Reply</h3>

              {sendError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-700">{sendError}</p>
                </div>
              )}

              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Write your reply..."
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-500">Sending as {expertId}@myyoga.guru</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowReply(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendReply}
                    disabled={sending || !replyText.trim()}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {sending ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
