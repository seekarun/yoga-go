'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Survey } from '@/types';
import SurveyCard from '@/components/survey/SurveyCard';

export default function SurveyListPage() {
  const params = useParams();
  const expertId = params.expertId as string;

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId]);

  const fetchSurveys = async () => {
    try {
      console.log('[DBG][survey-list] Fetching surveys for expert:', expertId);
      const response = await fetch(`/api/srv/experts/${expertId}/survey`);
      const data = await response.json();

      if (data.success) {
        setSurveys(data.data || []);
        console.log('[DBG][survey-list] Surveys loaded:', data.data?.length || 0);
      } else {
        setError(data.error || 'Failed to load surveys');
      }
    } catch (err) {
      console.error('[DBG][survey-list] Error fetching surveys:', err);
      setError('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (surveyId: string) => {
    if (!confirm('Are you sure you want to publish this survey? It will be visible to users.')) {
      return;
    }

    setActionLoading(surveyId);
    try {
      const response = await fetch(`/api/srv/experts/${expertId}/survey/${surveyId}/publish`, {
        method: 'PUT',
      });
      const data = await response.json();

      if (data.success) {
        // Update the survey in the list
        setSurveys(surveys.map(s => (s.id === surveyId ? data.data : s)));
      } else {
        alert(data.error || 'Failed to publish survey');
      }
    } catch (err) {
      console.error('[DBG][survey-list] Error publishing survey:', err);
      alert('Failed to publish survey');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async (surveyId: string) => {
    if (
      !confirm(
        'Are you sure you want to close this survey? Users will no longer be able to submit responses.'
      )
    ) {
      return;
    }

    setActionLoading(surveyId);
    try {
      const response = await fetch(`/api/srv/experts/${expertId}/survey/${surveyId}/close`, {
        method: 'PUT',
      });
      const data = await response.json();

      if (data.success) {
        setSurveys(surveys.map(s => (s.id === surveyId ? data.data : s)));
      } else {
        alert(data.error || 'Failed to close survey');
      }
    } catch (err) {
      console.error('[DBG][survey-list] Error closing survey:', err);
      alert('Failed to close survey');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopen = async (surveyId: string) => {
    if (
      !confirm(
        'Are you sure you want to reopen this survey? Users will be able to submit responses again.'
      )
    ) {
      return;
    }

    setActionLoading(surveyId);
    try {
      const response = await fetch(`/api/srv/experts/${expertId}/survey/${surveyId}/reopen`, {
        method: 'PUT',
      });
      const data = await response.json();

      if (data.success) {
        setSurveys(surveys.map(s => (s.id === surveyId ? data.data : s)));
      } else {
        alert(data.error || 'Failed to reopen survey');
      }
    } catch (err) {
      console.error('[DBG][survey-list] Error reopening survey:', err);
      alert('Failed to reopen survey');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (surveyId: string) => {
    const survey = surveys.find(s => s.id === surveyId);
    if (
      !confirm(`Are you sure you want to delete "${survey?.title}"? This action cannot be undone.`)
    ) {
      return;
    }

    setActionLoading(surveyId);
    try {
      const response = await fetch(`/api/srv/experts/${expertId}/survey/${surveyId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setSurveys(surveys.filter(s => s.id !== surveyId));
      } else {
        alert(data.error || 'Failed to delete survey');
      }
    } catch (err) {
      console.error('[DBG][survey-list] Error deleting survey:', err);
      alert('Failed to delete survey');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading surveys...</p>
        </div>
      </div>
    );
  }

  // Group surveys by status
  const activeSurveys = surveys.filter(s => s.status === 'active');
  const draftSurveys = surveys.filter(s => s.status === 'draft');
  const closedSurveys = surveys.filter(s => s.status === 'closed');

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Surveys</h1>
              <p className="text-sm text-gray-500 mt-1">
                Create and manage surveys to learn about your audience
              </p>
            </div>
            <Link
              href={`/srv/${expertId}/survey/new`}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Survey
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

        {surveys.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No surveys yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first survey to start collecting feedback from your audience.
            </p>
            <Link
              href={`/srv/${expertId}/survey/new`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span className="text-xl mr-2">+</span>
              Create Your First Survey
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Surveys */}
            {activeSurveys.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Active Surveys ({activeSurveys.length})
                </h2>
                <div className="space-y-4">
                  {activeSurveys.map(survey => (
                    <SurveyCard
                      key={survey.id}
                      survey={survey}
                      expertId={expertId}
                      onClose={handleClose}
                      onDelete={handleDelete}
                      isLoading={actionLoading === survey.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Draft Surveys */}
            {draftSurveys.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full" />
                  Draft Surveys ({draftSurveys.length})
                </h2>
                <div className="space-y-4">
                  {draftSurveys.map(survey => (
                    <SurveyCard
                      key={survey.id}
                      survey={survey}
                      expertId={expertId}
                      onPublish={handlePublish}
                      onDelete={handleDelete}
                      isLoading={actionLoading === survey.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Closed Surveys */}
            {closedSurveys.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                  Closed Surveys ({closedSurveys.length})
                </h2>
                <div className="space-y-4">
                  {closedSurveys.map(survey => (
                    <SurveyCard
                      key={survey.id}
                      survey={survey}
                      expertId={expertId}
                      onReopen={handleReopen}
                      onDelete={handleDelete}
                      isLoading={actionLoading === survey.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
