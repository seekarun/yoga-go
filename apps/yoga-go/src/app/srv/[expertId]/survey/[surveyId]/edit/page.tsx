'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import SurveyEditor from '@/components/survey/SurveyEditor';
import type { SurveyFormData } from '@/components/survey/SurveyEditor';
import type { Survey } from '@/types';

export default function EditSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const surveyId = params.surveyId as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSurvey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId, surveyId]);

  const fetchSurvey = async () => {
    try {
      console.log('[DBG][edit-survey-page] Fetching survey:', surveyId);
      const response = await fetch(`/api/srv/experts/${expertId}/survey/${surveyId}`);
      const result = await response.json();

      if (result.success) {
        setSurvey(result.data);
        console.log('[DBG][edit-survey-page] Survey loaded:', result.data.title);
      } else {
        setError(result.error || 'Failed to load survey');
      }
    } catch (err) {
      console.error('[DBG][edit-survey-page] Error fetching survey:', err);
      setError('An error occurred while loading the survey');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: SurveyFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('[DBG][edit-survey-page] Updating survey:', surveyId);
      const response = await fetch(`/api/srv/experts/${expertId}/survey/${surveyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[DBG][edit-survey-page] Survey updated');
        router.push(`/srv/${expertId}/survey`);
      } else {
        setError(result.error || 'Failed to update survey');
      }
    } catch (err) {
      console.error('[DBG][edit-survey-page] Error updating survey:', err);
      setError('An error occurred while updating the survey');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/srv/${expertId}/survey`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Survey Not Found</h2>
          <p className="text-red-700 mb-4">{error || 'The requested survey could not be found.'}</p>
          <Link
            href={`/srv/${expertId}/survey`}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Surveys
          </Link>
        </div>
      </div>
    );
  }

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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Survey</h1>
              <p className="text-sm text-gray-500 mt-1">{survey.title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
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
        )}

        <SurveyEditor
          initialData={survey}
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={isSubmitting}
          mode="edit"
        />
      </div>
    </>
  );
}
