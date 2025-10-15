'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Expert } from '@/types';

export default function ExpertPortalHome() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExperts();
  }, []);

  const fetchExperts = async () => {
    console.log('[DBG][srv/page.tsx] Fetching experts');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/data/experts');
      const result = await response.json();

      console.log('[DBG][srv/page.tsx] Experts response:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch experts');
      }

      setExperts(result.data || []);
    } catch (err) {
      console.error('[DBG][srv/page.tsx] Error fetching experts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch experts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Expert Portal</h1>
          <p className="text-xl text-gray-600">
            Manage your courses, track engagement, and view subscriber statistics
          </p>
          <div className="mt-6">
            <Link
              href="/srv/new"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add New Expert
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg max-w-4xl mx-auto">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="max-w-4xl mx-auto text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            <p className="mt-4 text-gray-600">Loading experts...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && experts.length === 0 && (
          <div className="max-w-4xl mx-auto text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No experts found</h3>
            <p className="mt-2 text-gray-600">Get started by adding your first expert.</p>
            <div className="mt-6">
              <Link
                href="/srv/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add First Expert
              </Link>
            </div>
          </div>
        )}

        {/* Experts Grid */}
        {!loading && !error && experts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {experts.map(expert => (
              <Link
                key={expert.id}
                href={`/srv/${expert.id}`}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200"
              >
                {/* Expert Avatar */}
                {expert.avatar && (
                  <div className="mb-4">
                    <img
                      src={expert.avatar}
                      alt={expert.name}
                      className="w-20 h-20 rounded-full object-cover mx-auto"
                    />
                  </div>
                )}

                <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">{expert.name}</h2>
                <p className="text-gray-600 mb-4 text-center text-sm">{expert.title}</p>

                {/* Stats */}
                <div className="flex justify-around mb-4 py-3 border-t border-b border-gray-100">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">{expert.totalCourses}</p>
                    <p className="text-xs text-gray-500">Courses</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">{expert.totalStudents}</p>
                    <p className="text-xs text-gray-500">Students</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      {expert.rating.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500">Rating</p>
                  </div>
                </div>

                <div className="flex items-center justify-center text-blue-600 font-medium text-sm">
                  <span>View Dashboard</span>
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            Note: Authentication will be added in future updates. Currently accessible to all users.
          </p>
        </div>
      </div>
    </div>
  );
}
