'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Survey } from '@/types';

export default function SurveysListPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        console.log('[DBG][surveys-list-page] Fetching surveys for expert:', expertId);
        const response = await fetch(`/data/experts/${expertId}/survey`);
        const data = await response.json();

        if (data.success) {
          setSurveys(data.data || []);
          console.log('[DBG][surveys-list-page] Surveys loaded:', data.data?.length || 0);

          // If only one survey, redirect directly to it
          if (data.data?.length === 1) {
            router.replace(`/experts/${expertId}/survey/${data.data[0].id}`);
          }
        } else {
          setError(data.error || 'Failed to load surveys');
          console.error('[DBG][surveys-list-page] Error loading surveys:', data.error);
        }
      } catch (err) {
        console.error('[DBG][surveys-list-page] Error fetching surveys:', err);
        setError('Failed to load surveys');
      } finally {
        setLoading(false);
      }
    };

    if (expertId) {
      fetchSurveys();
    }
  }, [expertId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading surveys...</div>
      </div>
    );
  }

  if (error || surveys.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl mb-4 text-gray-700">
            {error || 'No surveys available at this time'}
          </h2>
          <button
            onClick={() => router.push(`/experts/${expertId}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-5">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push(`/experts/${expertId}`)}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-gray-900">Available Surveys</h1>
        <p className="text-gray-600 mb-8">
          Help us improve by completing one of our surveys below.
        </p>

        <div className="space-y-4">
          {surveys.map(survey => (
            <Link
              key={survey.id}
              href={`/experts/${expertId}/survey/${survey.id}`}
              className="block bg-white rounded-xl p-6 shadow hover:shadow-md transition-shadow border border-gray-200"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{survey.title}</h2>
              {survey.description && (
                <p className="text-gray-600 mb-3 line-clamp-2">{survey.description}</p>
              )}
              <div className="flex items-center text-sm text-gray-500">
                <span>{survey.questions?.length || 0} questions</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
