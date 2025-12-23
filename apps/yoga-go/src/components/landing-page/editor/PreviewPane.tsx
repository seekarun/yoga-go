'use client';

import { useState, useRef, useEffect } from 'react';
import type { CustomLandingPageConfig, LandingPageTemplate } from '@/types';
import { sectionRegistry, type SectionType } from '../sections';
import SectionWrapper from '../shared/SectionWrapper';
import { templates, DEFAULT_TEMPLATE } from '../templates';
import { generatePalette } from '@/lib/colorPalette';
import { LandingPageThemeProvider } from '../ThemeProvider';

type ViewMode = 'desktop' | 'mobile';

// Preset brand colors for quick selection
const PRESET_COLORS = [
  '#E07A5F', // Coral
  '#81B29A', // Sage
  '#3D5A80', // Ocean
  '#F2994A', // Sunset
  '#9B8AB8', // Lavender
  '#2A9D8F', // Teal
  '#C97B84', // Rose
  '#264653', // Midnight
];

// Validate hex color format
function isValidHexColor(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

interface PreviewPaneProps {
  data: CustomLandingPageConfig;
  sectionOrder: SectionType[];
  disabledSections: SectionType[];
  selectedSection: SectionType | null;
  expertName?: string;
  expertBio?: string;
  expertId?: string;
  onSelectSection: (sectionId: SectionType | null) => void;
  onChange: (updates: Partial<CustomLandingPageConfig>) => void;
}

export default function PreviewPane({
  data,
  sectionOrder,
  disabledSections,
  selectedSection,
  expertName,
  expertBio,
  expertId,
  onSelectSection,
  onChange,
}: PreviewPaneProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const currentTemplate = data.template || DEFAULT_TEMPLATE;
  const currentBrandColor = data.theme?.primaryColor || '#2A9D8F';
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hexInput, setHexInput] = useState(currentBrandColor);
  const [hexError, setHexError] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Sync hex input when color changes externally
  useEffect(() => {
    setHexInput(currentBrandColor);
    setHexError(false);
  }, [currentBrandColor]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  const handleTemplateChange = (template: LandingPageTemplate) => {
    onChange({ template });
  };

  const handleBrandColorChange = (color: string, closePopup = false) => {
    // Generate a complete color palette from the primary color
    const palette = generatePalette(color);
    onChange({
      theme: {
        ...data.theme,
        primaryColor: color,
        palette: palette,
      },
    });
    setHexInput(color);
    setHexError(false);
    if (closePopup) {
      setShowColorPicker(false);
    }
  };

  const handleHexInputChange = (value: string) => {
    // Allow typing with or without #
    let hex = value.toUpperCase();
    if (!hex.startsWith('#')) {
      hex = '#' + hex;
    }
    setHexInput(hex);

    // Validate and apply if valid
    if (isValidHexColor(hex)) {
      setHexError(false);
      handleBrandColorChange(hex);
    } else if (hex.length > 1) {
      setHexError(true);
    }
  };

  const handleHexInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isValidHexColor(hexInput)) {
      handleBrandColorChange(hexInput, true);
    }
  };

  // Filter out disabled sections for preview
  const visibleSections = sectionOrder.filter(id => !disabledSections.includes(id));

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Preview Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Preview</h3>
          <div className="flex items-center gap-3">
            {/* Template Selector */}
            <select
              value={currentTemplate}
              onChange={e => handleTemplateChange(e.target.value as LandingPageTemplate)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Brand Color Selector */}
            <div className="relative" ref={colorPickerRef}>
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                title="Brand Color"
              >
                <span
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: currentBrandColor }}
                />
                <span className="hidden sm:inline">Brand</span>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showColorPicker && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 w-[240px]">
                  <div className="text-xs font-medium text-gray-700 mb-3">Brand Color</div>

                  {/* Color Picker */}
                  <div className="mb-4">
                    <div
                      className="relative w-full h-32 rounded-lg overflow-hidden cursor-pointer border border-gray-200"
                      onClick={() => colorInputRef.current?.click()}
                    >
                      <input
                        ref={colorInputRef}
                        type="color"
                        value={currentBrandColor}
                        onChange={e => handleBrandColorChange(e.target.value)}
                        className="absolute inset-0 w-[200%] h-[200%] cursor-pointer border-0 -top-1/2 -left-1/2"
                      />
                    </div>
                  </div>

                  {/* Hex Input */}
                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 mb-1">Hex Code</label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-md border border-gray-200 flex-shrink-0"
                        style={{
                          backgroundColor: isValidHexColor(hexInput) ? hexInput : currentBrandColor,
                        }}
                      />
                      <input
                        type="text"
                        value={hexInput}
                        onChange={e => handleHexInputChange(e.target.value)}
                        onKeyDown={handleHexInputKeyDown}
                        placeholder="#000000"
                        maxLength={7}
                        className={`flex-1 px-2 py-1.5 text-sm border rounded-md font-mono uppercase ${
                          hexError
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500'
                        } focus:outline-none focus:ring-1`}
                      />
                    </div>
                    {hexError && (
                      <p className="text-xs text-red-500 mt-1">Enter valid hex (e.g. #FF5733)</p>
                    )}
                  </div>

                  {/* Preset Colors */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Presets</label>
                    <div className="grid grid-cols-8 gap-1.5">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => handleBrandColorChange(color, true)}
                          className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${
                            currentBrandColor.toUpperCase() === color.toUpperCase()
                              ? 'border-gray-800 ring-1 ring-offset-1 ring-gray-400'
                              : 'border-gray-200'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

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
            <LandingPageThemeProvider palette={data.theme?.palette}>
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
                      <PreviewComponent
                        data={data}
                        expertName={expertName}
                        expertBio={expertBio}
                        expertId={expertId}
                        template={currentTemplate}
                      />
                    </SectionWrapper>
                  );
                })
              )}
            </LandingPageThemeProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
