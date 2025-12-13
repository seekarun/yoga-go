'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import SurveyEditor from '@/components/survey/SurveyEditor';
import type { SurveyFormData } from '@/components/survey/SurveyEditor';

export default function NewSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (data: SurveyFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[DBG][new-survey-page] Creating survey:', data.title);
      const response = await fetch(`/api/srv/experts/${expertId}/survey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[DBG][new-survey-page] Survey created:', result.data.id);
        router.push(`/srv/${expertId}/survey`);
      } else {
        setError(result.error || 'Failed to create survey');
      }
    } catch (err) {
      console.error('[DBG][new-survey-page] Error creating survey:', err);
      setError('An error occurred while creating the survey');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/srv/${expertId}/survey`);
  };

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
              <h1 className="text-2xl font-bold text-gray-900">Create New Survey</h1>
              <p className="text-sm text-gray-500 mt-1">
                Create a new survey to collect feedback from your audience
              </p>
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
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={isLoading}
          mode="create"
        />
      </div>
    </>
  );
}
