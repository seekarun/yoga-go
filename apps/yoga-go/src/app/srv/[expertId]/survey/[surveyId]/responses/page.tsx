'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { SurveyQuestion } from '@/types';
import SurveyStatusBadge from '@/components/survey/SurveyStatusBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import NotificationOverlay from '@/components/NotificationOverlay';
import type { SurveyStatus } from '@/types';

interface SurveyResponseMetadata {
  country?: string;
  countryRegion?: string;
  city?: string;
  timezone?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  browser?: string;
  os?: string;
  language?: string;
}

interface SurveyResponseData {
  id: string;
  surveyId: string;
  expertId: string;
  userId?: string;
  contactInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  answers: Array<{
    questionId: string;
    answer: string;
    questionText: string;
    questionType: string;
  }>;
  submittedAt: string;
  metadata?: SurveyResponseMetadata;
}

interface ResponsesData {
  survey: {
    id: string;
    title: string;
    description?: string;
    questions: SurveyQuestion[];
    status: SurveyStatus;
  };
  responses: SurveyResponseData[];
  total: number;
}

export default function SurveyResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const surveyId = params.surveyId as string;

  const [data, setData] = useState<ResponsesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResponses, setSelectedResponses] = useState<Set<string>>(new Set());
  const [filterQuestion, setFilterQuestion] = useState<string>('');
  const [filterAnswer, setFilterAnswer] = useState<string>('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);

  useEffect(() => {
    fetchResponses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId, surveyId, filterQuestion, filterAnswer]);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filterQuestion) queryParams.set('questionId', filterQuestion);
      if (filterAnswer) queryParams.set('answer', filterAnswer);

      const url = `/api/srv/experts/${expertId}/survey/${surveyId}/responses${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;

      console.log('[DBG][survey-responses-page] Fetching responses:', url);
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
        console.log('[DBG][survey-responses-page] Loaded', result.data.total, 'responses');
      } else {
        setError(result.error || 'Failed to load responses');
      }
    } catch (err) {
      console.error('[DBG][survey-responses-page] Error fetching responses:', err);
      setError('An error occurred while loading responses');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedResponses.size === filteredResponses.length) {
      setSelectedResponses(new Set());
    } else {
      setSelectedResponses(new Set(filteredResponses.map(r => r.id)));
    }
  };

  const toggleSelectResponse = (responseId: string) => {
    const newSelected = new Set(selectedResponses);
    if (newSelected.has(responseId)) {
      newSelected.delete(responseId);
    } else {
      newSelected.add(responseId);
    }
    setSelectedResponses(newSelected);
  };

  const handleSendEmail = async () => {
    if (selectedResponses.size === 0) {
      setNotification({ message: 'Please select at least one response', type: 'warning' });
      return;
    }

    if (!emailSubject.trim() || !emailMessage.trim()) {
      setNotification({ message: 'Please enter both subject and message', type: 'warning' });
      return;
    }

    try {
      setSendingEmail(true);
      const response = await fetch(`/api/srv/experts/${expertId}/survey/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyId,
          responseIds: Array.from(selectedResponses),
          subject: emailSubject,
          message: emailMessage,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setNotification({
          message: `Email sent to ${result.data.sent} recipients!`,
          type: 'success',
        });
        setShowEmailModal(false);
        setEmailSubject('');
        setEmailMessage('');
        setSelectedResponses(new Set());
      } else {
        setNotification({ message: result.error || 'Failed to send email', type: 'error' });
      }
    } catch (err) {
      console.error('[DBG][survey-responses-page] Error sending email:', err);
      setNotification({ message: 'An error occurred while sending email', type: 'error' });
    } finally {
      setSendingEmail(false);
    }
  };

  const clearFilters = () => {
    setFilterQuestion('');
    setFilterAnswer('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" message="Loading responses..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => router.push(`/srv/${expertId}/survey`)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Surveys
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Helper to get option label from option ID
  const getAnswerDisplay = (questionId: string, answer: string, questionType: string): string => {
    // For text questions, just return the answer as-is
    if (questionType === 'text') {
      return answer;
    }

    // For multiple choice, look up the option label
    const question = data.survey.questions.find(q => q.id === questionId);
    if (question?.options) {
      const option = question.options.find(opt => opt.id === answer);
      if (option) {
        return option.label;
      }
    }

    // Fallback to the raw answer if lookup fails
    return answer;
  };

  const filteredResponses = data.responses;
  const hasFilters = filterQuestion && filterAnswer;

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/srv/${expertId}/survey`}
              className="text-gray-500 hover:text-gray-700 transition-colors"
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
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Survey Responses</h1>
                <SurveyStatusBadge status={data.survey.status} />
              </div>
              <p className="text-sm text-gray-500 mt-1">{data.survey.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Responses</h3>
            <p className="text-3xl font-bold text-gray-900">{data.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Filtered Results</h3>
            <p className="text-3xl font-bold text-gray-900">{filteredResponses.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Selected</h3>
            <p className="text-3xl font-bold text-blue-600">{selectedResponses.size}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Responses</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Question
              </label>
              <select
                value={filterQuestion}
                onChange={e => {
                  setFilterQuestion(e.target.value);
                  setFilterAnswer('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Questions</option>
                {data.survey.questions.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.questionText}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Answer
              </label>
              {filterQuestion ? (
                <select
                  value={filterAnswer}
                  onChange={e => setFilterAnswer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Answers</option>
                  {data.survey.questions
                    .find(q => q.id === filterQuestion)
                    ?.options?.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  type="text"
                  disabled
                  placeholder="Select a question first"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              )}
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                disabled={!hasFilters}
                className={`px-4 py-2 rounded-lg ${
                  hasFilters
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        {selectedResponses.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <p className="text-blue-800">{selectedResponses.size} response(s) selected</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="px-4 py-2 text-white rounded-lg transition-opacity hover:opacity-90"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Email Selected Users
                </button>
                <button
                  onClick={() => setSelectedResponses(new Set())}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Deselect All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Responses Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedResponses.size > 0 &&
                        selectedResponses.size === filteredResponses.length
                      }
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location / Device
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredResponses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No responses found
                      {hasFilters && ' with the selected filters'}
                    </td>
                  </tr>
                ) : (
                  filteredResponses.map(response => (
                    <tr key={response.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedResponses.has(response.id)}
                          onChange={() => toggleSelectResponse(response.id)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {response.contactInfo?.name && (
                            <div className="font-medium text-gray-900">
                              {response.contactInfo.name}
                            </div>
                          )}
                          {response.contactInfo?.email && (
                            <div className="text-gray-600">{response.contactInfo.email}</div>
                          )}
                          {response.contactInfo?.phone && (
                            <div className="text-gray-500">{response.contactInfo.phone}</div>
                          )}
                          {!response.contactInfo?.name &&
                            !response.contactInfo?.email &&
                            !response.contactInfo?.phone && (
                              <span className="text-gray-400 italic">Anonymous</span>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          {response.answers.map((ans, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="font-medium text-gray-700">{ans.questionText}:</span>{' '}
                              <span className="text-gray-900">
                                {getAnswerDisplay(ans.questionId, ans.answer, ans.questionType)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          {response.metadata?.city || response.metadata?.country ? (
                            <div className="flex items-center gap-1 text-gray-700">
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
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <span>
                                {[
                                  response.metadata?.city,
                                  response.metadata?.countryRegion,
                                  response.metadata?.country,
                                ]
                                  .filter(Boolean)
                                  .join(', ')}
                              </span>
                            </div>
                          ) : null}
                          {response.metadata?.deviceType || response.metadata?.browser ? (
                            <div className="flex items-center gap-1 text-gray-500">
                              <svg
                                className="w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                {response.metadata?.deviceType === 'mobile' ? (
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                                  />
                                ) : (
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                  />
                                )}
                              </svg>
                              <span>
                                {[
                                  response.metadata?.deviceType !== 'unknown' &&
                                    response.metadata?.deviceType,
                                  response.metadata?.browser,
                                  response.metadata?.os,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            </div>
                          ) : null}
                          {!response.metadata?.city &&
                            !response.metadata?.country &&
                            !response.metadata?.deviceType &&
                            !response.metadata?.browser && (
                              <span className="text-gray-400 italic">No data</span>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(response.submittedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Email {selectedResponses.size} Selected User(s)
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  placeholder="Enter email message"
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailSubject('');
                    setEmailMessage('');
                  }}
                  disabled={sendingEmail}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="px-4 py-2 text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Overlay */}
      <NotificationOverlay
        isOpen={notification !== null}
        onClose={() => setNotification(null)}
        message={notification?.message || ''}
        type={notification?.type || 'error'}
        duration={4000}
      />
    </>
  );
}
