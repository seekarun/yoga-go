'use client';

import Link from 'next/link';

export default function ExpertPortalHome() {
  const experts = [
    { id: 'deepak', name: 'Deepak', title: 'Yoga Master & Wellness Coach' },
    { id: 'kavitha', name: 'Kavitha', title: 'Vinyasa Flow & Therapeutic Yoga Expert' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Expert Portal</h1>
          <p className="text-xl text-gray-600">
            Manage your courses, track engagement, and view subscriber statistics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {experts.map(expert => (
            <Link
              key={expert.id}
              href={`/srv/${expert.id}`}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-8 border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{expert.name}</h2>
              <p className="text-gray-600 mb-4">{expert.title}</p>
              <div className="flex items-center text-blue-600 font-medium">
                <span>View Dashboard</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            Note: Authentication will be added in future updates. Currently accessible to all users.
          </p>
        </div>
      </div>
    </div>
  );
}
