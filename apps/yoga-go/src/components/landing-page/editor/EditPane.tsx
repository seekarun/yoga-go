'use client';

import type { CustomLandingPageConfig } from '@/types';
import { sectionRegistry, type SectionType } from '../sections';
import SectionList from './SectionList';

interface EditPaneProps {
  data: CustomLandingPageConfig;
  sectionOrder: SectionType[];
  disabledSections: SectionType[];
  selectedSection: SectionType | null;
  expertId: string;
  onDataChange: (updates: Partial<CustomLandingPageConfig>) => void;
  onReorder: (newOrder: SectionType[]) => void;
  onToggleSection: (sectionId: SectionType) => void;
  onSelectSection: (sectionId: SectionType | null) => void;
  onError?: (error: string) => void;
}

export default function EditPane({
  data,
  sectionOrder,
  disabledSections,
  selectedSection,
  expertId,
  onDataChange,
  onReorder,
  onToggleSection,
  onSelectSection,
  onError,
}: EditPaneProps) {
  // If no section is selected, show section list
  if (!selectedSection) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Edit Pane Header */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Sections</h2>
        </div>

        {/* Section List */}
        <div className="flex-1 overflow-auto p-6">
          <SectionList
            sectionOrder={sectionOrder}
            disabledSections={disabledSections}
            onReorder={onReorder}
            onToggleSection={onToggleSection}
            onSelectSection={onSelectSection}
          />
        </div>
      </div>
    );
  }

  // Get the selected section config
  const section = sectionRegistry[selectedSection];
  const EditorComponent = section.EditorComponent;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Edit Pane Header with Back Button */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectSection(null)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to section list"
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
          </button>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--color-primary)' }}>{section.icon}</span>
            <h2 className="text-lg font-semibold text-gray-900">{section.label}</h2>
          </div>
        </div>
      </div>

      {/* Section Editor */}
      <div className="flex-1 overflow-auto p-6">
        <EditorComponent
          data={data}
          onChange={onDataChange}
          expertId={expertId}
          onError={onError}
        />
      </div>
    </div>
  );
}
