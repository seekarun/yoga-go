'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CustomLandingPageConfig, Expert } from '@/types';
import { DEFAULT_SECTION_ORDER, type SectionType } from '../sections';
import PreviewPane from './PreviewPane';
import EditPane from './EditPane';
import LoadingSpinner from '@/components/LoadingSpinner';

interface LandingPageEditorProps {
  expertId: string;
}

// Auto-save delay in milliseconds
const AUTO_SAVE_DELAY = 1500;

export default function LandingPageEditor({ expertId }: LandingPageEditorProps) {
  const router = useRouter();

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Expert data
  const [expert, setExpert] = useState<Expert | null>(null);

  // Editor state
  const [data, setData] = useState<CustomLandingPageConfig>({});
  const [sectionOrder, setSectionOrder] = useState<SectionType[]>(DEFAULT_SECTION_ORDER);
  const [disabledSections, setDisabledSections] = useState<SectionType[]>([]);
  const [selectedSection, setSelectedSection] = useState<SectionType | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Auto-save refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

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
        // Also add any new sections that aren't in the saved order
        if (landingPage.sectionOrder && landingPage.sectionOrder.length > 0) {
          const savedOrder = landingPage.sectionOrder as SectionType[];
          // Find sections in DEFAULT that aren't in saved order
          const newSections = DEFAULT_SECTION_ORDER.filter(s => !savedOrder.includes(s));
          // Insert new sections before 'act' (CTA), or at the end
          if (newSections.length > 0) {
            const actIndex = savedOrder.indexOf('act');
            if (actIndex !== -1) {
              // Insert new sections before 'act'
              const updatedOrder = [
                ...savedOrder.slice(0, actIndex),
                ...newSections,
                ...savedOrder.slice(actIndex),
              ];
              setSectionOrder(updatedOrder);
            } else {
              // Just append at the end
              setSectionOrder([...savedOrder, ...newSections]);
            }
          } else {
            setSectionOrder(savedOrder);
          }
        }

        // Load disabled sections
        if (landingPage.disabledSections) {
          setDisabledSections(landingPage.disabledSections as SectionType[]);
        }

        // Mark initial load as complete after a short delay
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 100);
      } catch (err) {
        console.error('[DBG][LandingPageEditor] Error loading expert:', err);
        setError(err instanceof Error ? err.message : 'Failed to load expert');
      } finally {
        setLoading(false);
      }
    };

    fetchExpertData();
  }, [expertId]);

  // Auto-save effect
  useEffect(() => {
    // Skip auto-save during initial load or if not dirty
    if (isInitialLoadRef.current || !isDirty || saving) {
      return;
    }

    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, AUTO_SAVE_DELAY);

    // Cleanup on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sectionOrder, disabledSections, isDirty]);

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

  // Core save function (used by both auto-save and manual save)
  const saveData = async (): Promise<boolean> => {
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

      const response = await fetch(`/data/experts/${expertId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(landingPageData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update landing page');
      }

      console.log('[DBG][LandingPageEditor] Landing page saved successfully');
      setIsDirty(false);
      setLastSaved(new Date());
      return true;
    } catch (err) {
      console.error('[DBG][LandingPageEditor] Error saving:', err);
      setError(err instanceof Error ? err.message : 'Failed to save landing page');
      return false;
    }
  };

  // Auto-save function (no redirect)
  const performAutoSave = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    await saveData();
    setSaving(false);
  };

  // Manual save handler (with redirect) - kept for potential future use
  const _handleSave = async () => {
    setSaving(true);
    setError('');

    const success = await saveData();

    if (success) {
      // Redirect to expert dashboard
      router.push(`/srv/${expertId}`);
    } else {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" message="Loading landing page editor..." />
      </div>
    );
  }

  // Error state (failed to load)
  if (!expert) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to load expert data'}</p>
          <Link
            href={`/srv/${expertId}`}
            className="hover:underline"
            style={{ color: 'var(--color-primary)' }}
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-100">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 shadow px-6 py-4 relative z-40">
        <div className="flex items-center gap-4">
          {/* Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900">Landing Page</h1>
            <p className="text-sm text-gray-500 flex items-center gap-2">
              {expert.name}
              {saving ? (
                <span className="flex items-center gap-1 text-gray-400">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </span>
              ) : isDirty ? (
                <span className="text-amber-600">• Unsaved</span>
              ) : lastSaved ? (
                <span className="text-green-600">✓ Saved</span>
              ) : null}
            </p>
          </div>

          {/* View Page Button */}
          <a
            href={`https://${expertId}.myyoga.guru`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            View Page
          </a>
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
            expertId={expertId}
            onSelectSection={handleSelectSection}
            onChange={handleDataChange}
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
