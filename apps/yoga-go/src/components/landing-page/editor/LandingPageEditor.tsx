'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CustomLandingPageConfig, Expert } from '@/types';
import { DEFAULT_SECTION_ORDER, type SectionType } from '../sections';
import PreviewPane from './PreviewPane';
import EditPane from './EditPane';
import LoadingSpinner from '@/components/LoadingSpinner';
import { PrimaryButton, SecondaryButton } from '@/components/Button';

interface LandingPageEditorProps {
  expertId: string;
}

// Auto-save delay in milliseconds
const AUTO_SAVE_DELAY = 1500;

// Fixed sections that cannot be reordered
const FIXED_TOP_SECTIONS: SectionType[] = ['hero'];
const FIXED_BOTTOM_SECTIONS: SectionType[] = ['footer'];

// Normalize section order to ensure hero is first and footer is last
function normalizeSectionOrder(order: SectionType[]): SectionType[] {
  // Extract fixed sections
  const topSections = order.filter(id => FIXED_TOP_SECTIONS.includes(id));
  const bottomSections = order.filter(id => FIXED_BOTTOM_SECTIONS.includes(id));
  const middleSections = order.filter(
    id => !FIXED_TOP_SECTIONS.includes(id) && !FIXED_BOTTOM_SECTIONS.includes(id)
  );

  // Ensure fixed sections exist
  const finalTop = topSections.length > 0 ? topSections : FIXED_TOP_SECTIONS;
  const finalBottom = bottomSections.length > 0 ? bottomSections : FIXED_BOTTOM_SECTIONS;

  return [...finalTop, ...middleSections, ...finalBottom];
}

export default function LandingPageEditor({ expertId }: LandingPageEditorProps) {
  const router = useRouter();

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  // Expert data
  const [expert, setExpert] = useState<Expert | null>(null);

  // Publish state
  const [isPublished, setIsPublished] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);

  // Discard state
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  // Editor state
  const [data, setData] = useState<CustomLandingPageConfig>({});
  const [sectionOrder, setSectionOrder] = useState<SectionType[]>(DEFAULT_SECTION_ORDER);
  const [disabledSections, setDisabledSections] = useState<SectionType[]>([]);
  const [selectedSection, setSelectedSection] = useState<SectionType | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isEditPaneVisible, setIsEditPaneVisible] = useState(true);

  // Auto-save refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
        setIsPublished(expertData.isLandingPagePublished ?? false);

        // Check if there are unpublished changes (draft differs from published)
        const hasDraft = !!expertData.draftLandingPage;
        const hasPublished = !!expertData.customLandingPage;
        if (hasDraft && hasPublished) {
          // Compare draft and published - if different, mark as having unpublished changes
          const draftStr = JSON.stringify(expertData.draftLandingPage);
          const publishedStr = JSON.stringify(expertData.customLandingPage);
          setHasUnpublishedChanges(draftStr !== publishedStr);
        } else if (hasDraft && !hasPublished) {
          // Has draft but never published
          setHasUnpublishedChanges(true);
        } else {
          setHasUnpublishedChanges(false);
        }

        // Initialize editor state by merging published with draft
        // Draft overrides published, but we fall back to published for missing fields
        // This ensures template and other settings are preserved when draft was created before a feature existed
        const published = expertData.customLandingPage || {};
        const draft = expertData.draftLandingPage || {};
        const landingPage = { ...published, ...draft };
        console.log('[DBG][LandingPageEditor] Merged config:', {
          publishedTemplate: published.template,
          draftTemplate: draft.template,
          finalTemplate: landingPage.template,
        });
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
              setSectionOrder(normalizeSectionOrder(updatedOrder));
            } else {
              // Just append at the end
              setSectionOrder(normalizeSectionOrder([...savedOrder, ...newSections]));
            }
          } else {
            setSectionOrder(normalizeSectionOrder(savedOrder));
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

  // Saved indicator fade-away effect
  useEffect(() => {
    if (lastSaved) {
      // Show the indicator
      setShowSavedIndicator(true);

      // Clear any existing timeout
      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current);
      }

      // Set timeout to hide after 10 seconds
      savedIndicatorTimeoutRef.current = setTimeout(() => {
        setShowSavedIndicator(false);
      }, 10000);
    }

    return () => {
      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current);
      }
    };
  }, [lastSaved]);

  // Handle data changes
  const handleDataChange = useCallback((updates: Partial<CustomLandingPageConfig>) => {
    setData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  // Handle section reorder
  const handleReorder = useCallback((newOrder: SectionType[]) => {
    // Normalize to ensure hero is first and footer is last
    setSectionOrder(normalizeSectionOrder(newOrder));
    setIsDirty(true);
  }, []);

  // Handle section toggle (enable/disable)
  const handleToggleSection = useCallback((sectionId: SectionType) => {
    // Hero section cannot be disabled
    if (sectionId === 'hero') {
      return;
    }
    setDisabledSections(prev => {
      if (prev.includes(sectionId)) {
        return prev.filter(id => id !== sectionId);
      } else {
        return [...prev, sectionId];
      }
    });
    setIsDirty(true);
  }, []);

  // Handle section selection (also shows edit pane if hidden)
  const handleSelectSection = useCallback((sectionId: SectionType | null) => {
    setSelectedSection(sectionId);
    if (sectionId !== null) {
      setIsEditPaneVisible(true);
    }
  }, []);

  // Toggle edit pane visibility
  const toggleEditPane = useCallback(() => {
    setIsEditPaneVisible(prev => !prev);
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

      console.log('[DBG][LandingPageEditor] Landing page saved successfully (to draft)');
      setIsDirty(false);
      setLastSaved(new Date());
      // Saving always goes to draft, so we have unpublished changes
      setHasUnpublishedChanges(true);
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

  // Publish/unpublish handler
  const handlePublish = async (publish: boolean) => {
    setIsPublishing(true);
    setError('');

    try {
      // First, ensure any unsaved changes are saved
      if (isDirty) {
        const saved = await saveData();
        if (!saved) {
          setError('Failed to save changes before publishing');
          setIsPublishing(false);
          return;
        }
      }

      console.log('[DBG][LandingPageEditor] Publishing landing page:', publish);

      const response = await fetch('/data/app/expert/me/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update publish status');
      }

      setIsPublished(publish);
      // On publish, draft becomes published, so no more unpublished changes
      if (publish) {
        setHasUnpublishedChanges(false);
      }
      console.log('[DBG][LandingPageEditor] Publish status updated:', publish);
    } catch (err) {
      console.error('[DBG][LandingPageEditor] Publish error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update publish status');
    } finally {
      setIsPublishing(false);
    }
  };

  // Discard draft changes handler
  const handleDiscard = async () => {
    setIsDiscarding(true);
    setError('');

    try {
      console.log('[DBG][LandingPageEditor] Discarding draft changes');

      const response = await fetch('/data/app/expert/me/landing-page/discard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to discard changes');
      }

      // Reload expert data to get the reset state
      const expertData: Expert = result.data;
      console.log('[DBG][LandingPageEditor] Draft discarded, reloading data');

      // Update editor with published version (which draft was reset to)
      const landingPage = expertData.customLandingPage || {};
      setData(landingPage);

      // Update section order (normalized to ensure hero first, footer last)
      if (landingPage.sectionOrder && landingPage.sectionOrder.length > 0) {
        setSectionOrder(normalizeSectionOrder(landingPage.sectionOrder as SectionType[]));
      } else {
        setSectionOrder(DEFAULT_SECTION_ORDER);
      }

      // Update disabled sections
      if (landingPage.disabledSections) {
        setDisabledSections(landingPage.disabledSections as SectionType[]);
      } else {
        setDisabledSections([]);
      }

      setHasUnpublishedChanges(false);
      setIsDirty(false);
      setShowDiscardConfirm(false);
    } catch (err) {
      console.error('[DBG][LandingPageEditor] Discard error:', err);
      setError(err instanceof Error ? err.message : 'Failed to discard changes');
    } finally {
      setIsDiscarding(false);
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
              ) : (
                <span
                  className="text-green-600 transition-opacity duration-500"
                  style={{ opacity: showSavedIndicator ? 1 : 0 }}
                >
                  ✓ Saved
                </span>
              )}
            </p>
          </div>

          {/* Discard Changes Button - only show if there are unpublished changes and page has been published before */}
          {hasUnpublishedChanges && isPublished && (
            <button
              onClick={() => setShowDiscardConfirm(true)}
              disabled={isDiscarding || saving}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border"
              style={{
                color: 'var(--color-primary)',
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-primary) 25%, transparent)',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Discard unpublished changes
            </button>
          )}

          {/* Preview Draft Button - only show when not published */}
          {!isPublished && (
            <SecondaryButton
              href={`https://preview.myyoga.guru/${expertId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Preview Draft
            </SecondaryButton>
          )}

          {/* View Live Site Button - only show when published */}
          {isPublished && (
            <SecondaryButton
              href={`https://${expertId}.myyoga.guru`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-2"
            >
              View Live Site
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </SecondaryButton>
          )}

          {/* Publish Button - show when there are unpublished changes OR when not yet published */}
          {(hasUnpublishedChanges || !isPublished) && (
            <PrimaryButton
              onClick={() => handlePublish(true)}
              disabled={saving}
              loading={isPublishing}
              className="flex-shrink-0 flex items-center gap-2"
            >
              {!isPublishing && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {isPublishing ? 'Publishing...' : 'Publish'}
            </PrimaryButton>
          )}
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
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Pane - Preview (70% when edit visible, 100% when hidden) */}
        <div
          className="border-r border-gray-200 transition-all duration-300"
          style={{ width: isEditPaneVisible ? '70%' : '100%' }}
        >
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

        {/* Toggle Button - positioned at the edge */}
        <button
          onClick={toggleEditPane}
          className="absolute top-4 z-20 flex items-center justify-center w-6 h-12 bg-white border border-gray-300 rounded-l-lg shadow-md hover:bg-gray-50 transition-all duration-300"
          style={{ right: isEditPaneVisible ? '30%' : '0' }}
          title={isEditPaneVisible ? 'Hide editor' : 'Show editor'}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-gray-600 transition-transform duration-300 ${isEditPaneVisible ? '' : 'rotate-180'}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Right Pane - Edit (30% width, hideable) */}
        <div
          className="bg-white transition-all duration-300 overflow-hidden"
          style={{ width: isEditPaneVisible ? '30%' : '0' }}
        >
          {isEditPaneVisible && (
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
          )}
        </div>
      </div>

      {/* Discard Changes Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Discard Changes?</h3>
            <p className="text-gray-600 mb-6">
              This will reset your draft to match the currently published version. All unpublished
              changes will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                disabled={isDiscarding}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscard}
                disabled={isDiscarding}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isDiscarding ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
                    Discarding...
                  </>
                ) : (
                  'Discard Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
