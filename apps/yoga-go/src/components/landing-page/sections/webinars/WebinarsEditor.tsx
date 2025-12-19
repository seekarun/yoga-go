'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { SectionEditorProps } from '../types';
import type { Webinar } from '@/types';

export default function WebinarsEditor({ data, onChange, expertId }: SectionEditorProps) {
  const webinars = data.webinars || {};
  const [webinarList, setWebinarList] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWebinars = async () => {
      try {
        const response = await fetch('/data/app/expert/me/webinars');
        const result = await response.json();

        if (result.success && result.data) {
          setWebinarList(result.data);
        }
      } catch (err) {
        console.error('[DBG][WebinarsEditor] Error fetching webinars:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWebinars();
  }, []);

  const handleChange = (field: 'title' | 'description', value: string) => {
    onChange({
      webinars: {
        ...webinars,
        [field]: value,
      },
    });
  };

  const scheduledWebinars = webinarList.filter(
    w => w.status === 'SCHEDULED' || w.status === 'LIVE'
  );
  const draftWebinars = webinarList.filter(w => w.status === 'DRAFT');

  return (
    <div className="space-y-6">
      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm text-blue-800">
              This section displays your <strong>scheduled</strong> live sessions. Create live
              sessions and set their status to &quot;Scheduled&quot; to show them here.
            </p>
          </div>
        </div>
      </div>

      {/* Webinar Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Live Session Status</h4>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Live Sessions</span>
              <span className="text-sm font-medium text-gray-900">{webinarList.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Scheduled/Live (visible)</span>
              <span className="text-sm font-medium text-green-600">{scheduledWebinars.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Drafts (hidden)</span>
              <span className="text-sm font-medium text-gray-500">{draftWebinars.length}</span>
            </div>

            {scheduledWebinars.length > 0 && (
              <div className="mt-3 space-y-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  Showing on Landing Page
                </span>
                {scheduledWebinars.slice(0, 3).map(webinar => (
                  <div key={webinar.id} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-gray-700 truncate max-w-[180px]">{webinar.title}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          webinar.status === 'LIVE'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {webinar.status}
                      </span>
                    </div>
                  </div>
                ))}
                {scheduledWebinars.length > 3 && (
                  <p className="text-xs text-gray-500">+{scheduledWebinars.length - 3} more</p>
                )}
              </div>
            )}

            {draftWebinars.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  Draft Live Sessions (not visible)
                </span>
                {draftWebinars.slice(0, 2).map(webinar => (
                  <div key={webinar.id} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-gray-500 truncate max-w-[180px]">{webinar.title}</span>
                    <Link
                      href={`/srv/${expertId}/webinars/${webinar.id}`}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Edit →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Manage Webinars Link */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link
            href={`/srv/${expertId}/webinars`}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Manage Live Sessions
          </Link>
        </div>
      </div>

      {/* Section Customization */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Section Settings</h4>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Section Title</label>
          <input
            type="text"
            value={webinars.title || ''}
            onChange={e => handleChange('title', e.target.value)}
            placeholder="Live Sessions"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
          <input
            type="text"
            value={webinars.description || ''}
            onChange={e => handleChange('description', e.target.value)}
            placeholder="Join our expert in live interactive sessions"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* No Scheduled Webinars Warning */}
      {!loading && scheduledWebinars.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="text-sm text-amber-800 font-medium">No scheduled live sessions</p>
              <p className="text-sm text-amber-700 mt-1">
                {webinarList.length === 0
                  ? 'Create your first live session to show this section on your landing page.'
                  : 'Change a live session status to "Scheduled" to make it visible.'}
              </p>
              <Link
                href={`/srv/${expertId}/webinars${webinarList.length === 0 ? '/create' : ''}`}
                className="inline-flex items-center gap-1 mt-2 text-sm text-amber-800 hover:text-amber-900 font-medium underline"
              >
                {webinarList.length === 0
                  ? 'Create your first live session'
                  : 'Manage your live sessions'}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">How it works</h4>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Create a live session in the Live Sessions section</li>
          <li>Add sessions with dates and times</li>
          <li>Change status from &quot;Draft&quot; to &quot;Scheduled&quot;</li>
          <li>The live session appears on your landing page automatically</li>
          <li>Learners can click to view details and register</li>
        </ol>
      </div>
    </div>
  );
}
