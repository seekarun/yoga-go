'use client';

import { useState } from 'react';
import type { CustomLandingPageConfig } from '@/types';
import { sectionRegistry, type SectionType } from '../sections';
import SectionWrapper from '../shared/SectionWrapper';

type ViewMode = 'desktop' | 'mobile';

interface PreviewPaneProps {
  data: CustomLandingPageConfig;
  sectionOrder: SectionType[];
  disabledSections: SectionType[];
  selectedSection: SectionType | null;
  expertName?: string;
  expertBio?: string;
  onSelectSection: (sectionId: SectionType | null) => void;
}

export default function PreviewPane({
  data,
  sectionOrder,
  disabledSections,
  selectedSection,
  expertName,
  expertBio,
  onSelectSection,
}: PreviewPaneProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');

  // Filter out disabled sections for preview
  const visibleSections = sectionOrder.filter(id => !disabledSections.includes(id));

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Preview Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Preview</h3>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('desktop')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'desktop'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Desktop view"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'mobile'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Mobile view"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </button>
            </div>
            <span className="text-xs text-gray-500">70% scale</span>
          </div>
        </div>
      </div>

      {/* Scrollable Preview Container */}
      <div className="flex-1 overflow-auto p-4">
        {/* Scale wrapper */}
        <div
          style={{
            transform: 'scale(0.7)',
            transformOrigin: viewMode === 'mobile' ? 'top center' : 'top left',
            width: viewMode === 'mobile' ? '100%' : '142.86%', // 100% / 0.7 to fill container width
          }}
        >
          {/* Preview frame */}
          <div
            className="bg-white shadow-lg rounded-lg overflow-hidden"
            style={{
              minHeight: '600px',
              width: viewMode === 'mobile' ? '375px' : '100%',
              margin: viewMode === 'mobile' ? '0 auto' : '0',
            }}
            onClick={() => onSelectSection(null)}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                onSelectSection(null);
              }
            }}
            tabIndex={0}
            role="application"
            aria-label="Landing page preview"
          >
            {visibleSections.length === 0 ? (
              <div className="flex items-center justify-center h-96 text-gray-400">
                <div className="text-center">
                  <p className="text-lg mb-2">No sections visible</p>
                  <p className="text-sm">Enable sections in the panel on the right</p>
                </div>
              </div>
            ) : (
              visibleSections.map(sectionId => {
                const section = sectionRegistry[sectionId];
                const PreviewComponent = section.PreviewComponent;
                const isSelected = selectedSection === sectionId;
                const isDisabled = disabledSections.includes(sectionId);

                return (
                  <SectionWrapper
                    key={sectionId}
                    sectionId={sectionId}
                    label={section.label}
                    isSelected={isSelected}
                    isDisabled={isDisabled}
                    onClick={() => {
                      // Stop propagation to prevent deselecting
                      onSelectSection(sectionId);
                    }}
                  >
                    <PreviewComponent data={data} expertName={expertName} expertBio={expertBio} />
                  </SectionWrapper>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
