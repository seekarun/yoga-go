'use client';

import { useState } from 'react';
import { useSurveyModal } from '@/contexts/SurveyModalContext';
import { useExpert } from '@/contexts/ExpertContext';
import SurveyResponseWizard from './SurveyResponseWizard';
import LoadingSpinner from '@/components/LoadingSpinner';

/**
 * SurveyModal component that displays surveys in a modal overlay
 * Uses the SurveyModalContext for state management
 */
export default function SurveyModal() {
  const { isOpen, survey, loading, error, closeSurvey } = useSurveyModal();
  const { expertId } = useExpert();

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (
    contactInfo: Record<string, string>,
    answers: Record<string, string>
  ) => {
    if (!survey) return;

    console.log('[DBG][SurveyModal] Submitting survey response');
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Transform answers to the expected format
      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      const response = await fetch(`/data/experts/${expertId}/survey/${survey.id}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactInfo: {
            name: contactInfo.name || undefined,
            email: contactInfo.email || undefined,
            phone: contactInfo.phone || undefined,
          },
          answers: formattedAnswers,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[DBG][SurveyModal] Survey submitted successfully');
        setSubmitted(true);
        // Auto-close after showing thank you
        setTimeout(() => {
          closeSurvey();
          setSubmitted(false);
        }, 2000);
      } else {
        setSubmitError(result.error || 'Failed to submit survey');
      }
    } catch (err) {
      console.error('[DBG][SurveyModal] Error submitting survey:', err);
      setSubmitError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    closeSurvey();
    setSubmitted(false);
    setSubmitError(null);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 text-center shadow-xl">
          <LoadingSpinner size="lg" message="Loading survey..." />
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !survey) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Unable to Load Survey</h2>
          <p className="text-gray-600 mb-6">{error || 'The survey could not be found.'}</p>
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Show the survey wizard
  return (
    <SurveyResponseWizard
      survey={survey}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitting={submitting}
      submitted={submitted}
      error={submitError}
    />
  );
}
