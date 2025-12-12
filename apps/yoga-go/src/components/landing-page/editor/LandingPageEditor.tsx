'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CustomLandingPageConfig, Expert } from '@/types';
import { DEFAULT_SECTION_ORDER, type SectionType } from '../sections';
import PreviewPane from './PreviewPane';
import EditPane from './EditPane';

interface LandingPageEditorProps {
  expertId: string;
}

export default function LandingPageEditor({ expertId }: LandingPageEditorProps) {
  const router = useRouter();

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Expert data
  const [expert, setExpert] = useState<Expert | null>(null);

  // Editor state
  const [data, setData] = useState<CustomLandingPageConfig>({});
  const [sectionOrder, setSectionOrder] = useState<SectionType[]>(DEFAULT_SECTION_ORDER);
  const [disabledSections, setDisabledSections] = useState<SectionType[]>([]);
  const [selectedSection, setSelectedSection] = useState<SectionType | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Fetch expert data on mount
  useEffect(() => {
    const fetchExpertData = async () => {
      try {
        setLoading(true);
        console.log('[DBG][LandingPageEditor] Fetching expert data:', expertId);

        const response = await fetch(`/data/experts/${expertId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to load expert');
        }

        const expertData: Expert = result.data;
        console.log('[DBG][LandingPageEditor] Expert loaded:', expertData);

        setExpert(expertData);

        // Initialize editor state from expert data
        const landingPage = expertData.customLandingPage || {};
        setData(landingPage);

        // Load section order or use default
        if (landingPage.sectionOrder && landingPage.sectionOrder.length > 0) {
          setSectionOrder(landingPage.sectionOrder as SectionType[]);
        }

        // Load disabled sections
        if (landingPage.disabledSections) {
          setDisabledSections(landingPage.disabledSections as SectionType[]);
        }
      } catch (err) {
        console.error('[DBG][LandingPageEditor] Error loading expert:', err);
        setError(err instanceof Error ? err.message : 'Failed to load expert');
      } finally {
        setLoading(false);
      }
    };

    fetchExpertData();
  }, [expertId]);

  // Handle data changes
  const handleDataChange = useCallback((updates: Partial<CustomLandingPageConfig>) => {
    setData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  // Handle section reorder
  const handleReorder = useCallback((newOrder: SectionType[]) => {
    setSectionOrder(newOrder);
    setIsDirty(true);
  }, []);

  // Handle section toggle (enable/disable)
  const handleToggleSection = useCallback((sectionId: SectionType) => {
    setDisabledSections(prev => {
      if (prev.includes(sectionId)) {
        return prev.filter(id => id !== sectionId);
      } else {
        return [...prev, sectionId];
      }
    });
    setIsDirty(true);
  }, []);

  // Handle section selection
  const handleSelectSection = useCallback((sectionId: SectionType | null) => {
    setSelectedSection(sectionId);
  }, []);

  // Handle error from child components
  const handleError = useCallback((errorMsg: string) => {
    setError(errorMsg);
  }, []);

  // Helper to trim all string values in an object recursively
  const trimStrings = (obj: CustomLandingPageConfig): CustomLandingPageConfig => {
    const trimValue = (value: unknown): unknown => {
      if (typeof value === 'string') {
        return value.trim();
      } else if (Array.isArray(value)) {
        return value.map(item => (typeof item === 'string' ? item.trim() : trimValue(item)));
      } else if (value && typeof value === 'object') {
        const result: Record<string, unknown> = {};
        for (const key in value) {
          result[key] = trimValue((value as Record<string, unknown>)[key]);
        }
        return result;
      }
      return value;
    };
    return trimValue(obj) as CustomLandingPageConfig;
  };

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      console.log('[DBG][LandingPageEditor] Saving landing page data');

      // Trim all string values before saving
      const trimmedData = trimStrings(data);

      // Prepare the landing page data with section order and disabled sections
      const landingPageData = {
        customLandingPage: {
          ...trimmedData,
          sectionOrder,
          disabledSections,
        },
      };

      console.log('[DBG][LandingPageEditor] Sending data:', landingPageData);

      const response = await fetch(`/data/experts/${expertId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(landingPageData),
      });

      const result = await response.json();
      console.log('[DBG][LandingPageEditor] Response:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update landing page');
      }

      console.log('[DBG][LandingPageEditor] Landing page updated successfully');
      setIsDirty(false);

      // Redirect to expert dashboard
      router.push(`/srv/${expertId}`);
    } catch (err) {
      console.error('[DBG][LandingPageEditor] Error saving:', err);
      setError(err instanceof Error ? err.message : 'Failed to save landing page');
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading landing page editor...</p>
        </div>
      </div>
    );
  }

  // Error state (failed to load)
  if (!expert) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to load expert data'}</p>
          <Link href={`/srv/${expertId}`} className="text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-100">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 relative z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/srv/${expertId}`}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to dashboard"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Edit Landing Page</h1>
              <p className="text-sm text-gray-500">
                {expert.name}
                {isDirty && <span className="ml-2 text-amber-600">(unsaved changes)</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/srv/${expertId}`}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm">{error}</p>
              <button
                onClick={() => setError('')}
                className="text-red-600 hover:text-red-800"
                title="Dismiss"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content - Side by Side */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane - Preview (40% width) */}
        <div className="w-2/5 border-r border-gray-200">
          <PreviewPane
            data={data}
            sectionOrder={sectionOrder}
            disabledSections={disabledSections}
            selectedSection={selectedSection}
            expertName={expert.name}
            expertBio={expert.bio}
            onSelectSection={handleSelectSection}
          />
        </div>

        {/* Right Pane - Edit (60% width) */}
        <div className="w-3/5">
          <EditPane
            data={data}
            sectionOrder={sectionOrder}
            disabledSections={disabledSections}
            selectedSection={selectedSection}
            expertId={expertId}
            onDataChange={handleDataChange}
            onReorder={handleReorder}
            onToggleSection={handleToggleSection}
            onSelectSection={handleSelectSection}
            onError={handleError}
          />
        </div>
      </div>
    </div>
  );
}
