'use client';

import { generatePalette, hexToHsl, hslToHex } from '@/lib/colorPalette';
import { DEFAULT_FONT, WEB_FONTS } from '@/lib/webFonts';
import type {
  BlogPost,
  Course,
  CustomLandingPageConfig,
  Expert,
  LandingPageTemplate,
  Webinar,
} from '@/types';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { sectionRegistry, type SectionType } from '../sections';
import SectionWrapper from '../shared/SectionWrapper';
import { DEFAULT_TEMPLATE, templates } from '../templates';
import { LandingPageThemeProvider } from '../ThemeProvider';
import ClassicPageTemplate from '@/templates/classic/ClassicPageTemplate';
import ModernPageTemplate from '@/templates/modern/ModernPageTemplate';
import ClassicDarkPageTemplate from '@/templates/classic-dark/ClassicDarkPageTemplate';
import type {
  LandingPageData,
  LandingPageConfig,
  LandingPageContext,
  SectionType as TemplateSectionType,
} from '@/templates/types';

type ViewMode = 'desktop' | 'mobile';

// Color harmony types
type ColorHarmony = 'analogous' | 'triadic' | 'split-complementary';

const HARMONY_OPTIONS: { type: ColorHarmony; label: string; description: string }[] = [
  { type: 'analogous', label: 'Analogous', description: 'Calm & unified' },
  { type: 'triadic', label: 'Triadic', description: 'Vibrant & balanced' },
  { type: 'split-complementary', label: 'Split-Comp', description: 'Sophisticated contrast' },
];

// Generate color palette based on harmony type
function getHarmonyColors(
  hexColor: string,
  harmony: ColorHarmony
): { secondary: string; highlight: string } {
  const hsl = hexToHsl(hexColor);

  switch (harmony) {
    case 'analogous': {
      // Adjacent colors on the wheel (30° apart)
      const secondary = hslToHex((hsl.h + 30) % 360, Math.max(30, hsl.s * 0.6), 85);
      const highlight = hslToHex((hsl.h - 30 + 360) % 360, Math.max(40, hsl.s * 0.7), 75);
      return { secondary, highlight };
    }
    case 'triadic': {
      // Evenly spaced (120° apart)
      const secondary = hslToHex((hsl.h + 120) % 360, Math.max(30, hsl.s * 0.5), 85);
      const highlight = hslToHex((hsl.h + 240) % 360, Math.max(40, hsl.s * 0.7), 75);
      return { secondary, highlight };
    }
    case 'split-complementary': {
      // Base + two colors adjacent to complement (150° and 210° from base)
      const secondary = hslToHex((hsl.h + 150) % 360, Math.max(30, hsl.s * 0.5), 85);
      const highlight = hslToHex((hsl.h + 210) % 360, Math.max(40, hsl.s * 0.7), 75);
      return { secondary, highlight };
    }
  }
}

// Validate hex color format
function isValidHexColor(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

interface PreviewPaneProps {
  data: CustomLandingPageConfig;
  sectionOrder: SectionType[];
  disabledSections: SectionType[];
  selectedSection: SectionType | null;
  expert: Expert;
  // Data for sections that display real content
  courses?: Course[];
  webinars?: Webinar[];
  latestBlogPost?: BlogPost;
  onSelectSection: (sectionId: SectionType | null) => void;
  onChange: (updates: Partial<CustomLandingPageConfig>) => void;
  // Optional render layout function for custom layouts
  // If provided, the header and preview are passed to this function instead of using default layout
  renderLayout?: (header: ReactNode, preview: ReactNode) => ReactNode;
}

export default function PreviewPane({
  data,
  sectionOrder,
  disabledSections,
  selectedSection,
  expert,
  courses = [],
  webinars = [],
  latestBlogPost,
  onSelectSection,
  onChange,
  renderLayout,
}: PreviewPaneProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const currentTemplate = data.template || DEFAULT_TEMPLATE;
  const currentBrandColor = data.theme?.primaryColor || '#2A9D8F';
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hexInput, setHexInput] = useState(currentBrandColor);
  const [hexError, setHexError] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [colorHarmony, setColorHarmony] = useState<ColorHarmony>(
    (data.theme?.palette?.harmonyType as ColorHarmony) || 'analogous'
  );
  const [showFontPicker, setShowFontPicker] = useState(false);
  const fontPickerRef = useRef<HTMLDivElement>(null);
  const currentFont = data.theme?.fontFamily || DEFAULT_FONT;

  // Cycle through harmony options
  const cycleHarmony = () => {
    const currentIndex = HARMONY_OPTIONS.findIndex(h => h.type === colorHarmony);
    const nextIndex = (currentIndex + 1) % HARMONY_OPTIONS.length;
    setColorHarmony(HARMONY_OPTIONS[nextIndex].type);
  };

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

  // Close font picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fontPickerRef.current && !fontPickerRef.current.contains(event.target as Node)) {
        setShowFontPicker(false);
      }
    };

    if (showFontPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFontPicker]);

  const handleTemplateChange = (template: LandingPageTemplate) => {
    onChange({ template });
  };

  const handleBrandColorChange = (color: string, closePopup = false) => {
    // Generate a complete color palette from the primary color
    const palette = generatePalette(color);
    // Add harmony colors to the palette
    const harmonyColors = getHarmonyColors(color, colorHarmony);
    onChange({
      theme: {
        ...data.theme,
        primaryColor: color,
        palette: {
          ...palette,
          secondary: harmonyColors.secondary,
          highlight: harmonyColors.highlight,
          harmonyType: colorHarmony,
        },
      },
    });
    setHexInput(color);
    setHexError(false);
    if (closePopup) {
      setShowColorPicker(false);
    }
  };

  // Update palette when harmony type changes
  const handleHarmonyChange = () => {
    cycleHarmony();
  };

  // Effect to update palette when harmony changes
  useEffect(() => {
    if (currentBrandColor && data.theme?.palette) {
      const harmonyColors = getHarmonyColors(currentBrandColor, colorHarmony);
      // Only update if harmony colors are different
      if (
        data.theme.palette.secondary !== harmonyColors.secondary ||
        data.theme.palette.highlight !== harmonyColors.highlight
      ) {
        onChange({
          theme: {
            ...data.theme,
            palette: {
              ...data.theme.palette,
              secondary: harmonyColors.secondary,
              highlight: harmonyColors.highlight,
              harmonyType: colorHarmony,
            },
          },
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorHarmony]);

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

  const handleFontChange = (fontFamily: string) => {
    onChange({
      theme: {
        ...data.theme,
        fontFamily,
      },
    });
    setShowFontPicker(false);
  };

  // Default CTA link resolver for editor preview
  const resolveCtaLink = (link: string | undefined): string => {
    if (!link) return '#';
    if (link.startsWith('http://') || link.startsWith('https://')) return link;
    if (link.startsWith('#')) return link;
    return `#${link}`;
  };

  // Build expert object with customLandingPage data for template
  const expertWithData: Expert = {
    ...expert,
    customLandingPage: data,
  };

  // Build template props
  const templateData: LandingPageData = {
    expert: expertWithData,
    courses,
    webinars,
    latestBlogPost,
  };

  const templateConfig: LandingPageConfig = {
    template: currentTemplate as 'classic' | 'modern' | 'classic-dark',
    sectionOrder: sectionOrder as TemplateSectionType[],
    disabledSections: disabledSections as TemplateSectionType[],
    theme: {
      primaryColor: data.theme?.primaryColor,
      palette: data.theme?.palette,
    },
  };

  const templateContext: LandingPageContext = {
    expertId: expert.id,
    resolveCtaLink,
    isPreviewMode: true,
  };

  // Render section callback - wraps each section with SectionWrapper for click-to-select
  const renderSection = (sectionId: TemplateSectionType, content: ReactNode): ReactNode => {
    const section = sectionRegistry[sectionId as SectionType];
    const isSelected = selectedSection === sectionId;
    const isDisabled = disabledSections.includes(sectionId as SectionType);

    return (
      <SectionWrapper
        key={sectionId}
        sectionId={sectionId}
        label={section?.label || sectionId}
        isSelected={isSelected}
        isDisabled={isDisabled}
        onClick={() => onSelectSection(sectionId as SectionType)}
      >
        {content}
      </SectionWrapper>
    );
  };

  // Get the template component based on current template
  const getTemplateComponent = () => {
    switch (currentTemplate) {
      case 'modern':
        return (
          <ModernPageTemplate
            data={templateData}
            config={templateConfig}
            context={templateContext}
            renderSection={renderSection}
          />
        );
      case 'classic-dark':
        return (
          <ClassicDarkPageTemplate
            data={templateData}
            config={templateConfig}
            context={templateContext}
            renderSection={renderSection}
          />
        );
      case 'classic':
      default:
        return (
          <ClassicPageTemplate
            data={templateData}
            config={templateConfig}
            context={templateContext}
            renderSection={renderSection}
          />
        );
    }
  };

  // Filter out disabled sections for preview (used for empty state check)
  const visibleSections = sectionOrder.filter(id => !disabledSections.includes(id));

  // Header content - template, color, font, and view mode controls
  const headerContent = (
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
              <div className="text-xs font-medium text-gray-700 mb-3">
                Your Brand Color (click to change)
              </div>

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

              {/* Color Palette Display */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500">Color Palette</label>
                  <button
                    onClick={cycleHarmony}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    title="Cycle color harmony"
                  >
                    <span className="text-[10px]">
                      {HARMONY_OPTIONS.find(h => h.type === colorHarmony)?.label}
                    </span>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                </div>
                {(() => {
                  const harmonyColors = getHarmonyColors(currentBrandColor, colorHarmony);
                  return (
                    <div className="flex flex-col gap-2">
                      {/* Primary */}
                      <div
                        className="h-10 rounded-lg border border-gray-200 flex items-center justify-center"
                        style={{ backgroundColor: currentBrandColor }}
                      >
                        <span
                          className="text-xs font-medium"
                          style={{
                            color: hexToHsl(currentBrandColor).l > 50 ? '#374151' : '#fff',
                          }}
                        >
                          Primary
                        </span>
                      </div>
                      {/* Secondary */}
                      <div
                        className="h-8 rounded-lg border border-gray-200 flex items-center justify-center"
                        style={{ backgroundColor: harmonyColors.secondary }}
                      >
                        <span className="text-xs font-medium text-gray-700">Secondary</span>
                      </div>
                      {/* Highlight */}
                      <div
                        className="h-8 rounded-lg border border-gray-200 flex items-center justify-center"
                        style={{ backgroundColor: harmonyColors.highlight }}
                      >
                        <span className="text-xs font-medium text-gray-700">Highlight</span>
                      </div>
                    </div>
                  );
                })()}
                <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                  {HARMONY_OPTIONS.find(h => h.type === colorHarmony)?.description}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Font Selector */}
        <div className="relative" ref={fontPickerRef}>
          <button
            onClick={() => setShowFontPicker(!showFontPicker)}
            className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
            title="Font"
            style={{ fontFamily: `'${currentFont}', sans-serif` }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
            <span className="hidden sm:inline max-w-[80px] truncate">{currentFont}</span>
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

          {showFontPicker && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-[220px] max-h-[400px] overflow-hidden flex flex-col">
              <div className="text-xs font-medium text-gray-700 px-3 py-2 border-b border-gray-100">
                Select Font
              </div>
              <div className="overflow-y-auto flex-1">
                {/* Sans-Serif */}
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                  Sans-Serif
                </div>
                {WEB_FONTS.filter(f => f.category === 'sans-serif').map(font => (
                  <button
                    key={font.value}
                    onClick={() => handleFontChange(font.value)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      currentFont === font.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                    style={{ fontFamily: `'${font.value}', sans-serif` }}
                  >
                    {font.label}
                  </button>
                ))}

                {/* Serif */}
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                  Serif
                </div>
                {WEB_FONTS.filter(f => f.category === 'serif').map(font => (
                  <button
                    key={font.value}
                    onClick={() => handleFontChange(font.value)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      currentFont === font.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                    style={{ fontFamily: `'${font.value}', serif` }}
                  >
                    {font.label}
                  </button>
                ))}

                {/* Display */}
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                  Display
                </div>
                {WEB_FONTS.filter(f => f.category === 'display').map(font => (
                  <button
                    key={font.value}
                    onClick={() => handleFontChange(font.value)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      currentFont === font.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                    style={{ fontFamily: `'${font.value}', sans-serif` }}
                  >
                    {font.label}
                  </button>
                ))}
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
  );

  // Preview content - the scaled landing page preview
  const previewContent = (
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
        <LandingPageThemeProvider palette={data.theme?.palette} fontFamily={currentFont}>
          {/* Override responsive styles based on preview mode */}
          {viewMode === 'mobile' && (
            <style
              dangerouslySetInnerHTML={{
                __html: `
                  .hero-section-mobile { display: block !important; }
                  .hero-section-desktop { display: none !important; }
                  .courses-grid, .webinars-grid { grid-template-columns: 1fr !important; }
                  .value-props-grid { grid-template-columns: 1fr !important; }
                  .about-grid { grid-template-columns: 1fr !important; }
                  .act-grid { grid-template-columns: 1fr !important; }
                  .footer-grid { grid-template-columns: 1fr !important; text-align: center; }
                  .gallery-grid { grid-template-columns: repeat(2, 1fr) !important; }
                `,
              }}
            />
          )}
          {visibleSections.length === 0 ? (
            <div className="flex items-center justify-center h-96 text-gray-400">
              <div className="text-center">
                <p className="text-lg mb-2">No sections visible</p>
                <p className="text-sm">Enable sections in the panel on the right</p>
              </div>
            </div>
          ) : (
            getTemplateComponent()
          )}
        </LandingPageThemeProvider>
      </div>
    </div>
  );

  // If renderLayout is provided, use custom layout
  if (renderLayout) {
    return <>{renderLayout(headerContent, previewContent)}</>;
  }

  // Default layout (standalone mode)
  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Preview Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200">
        {headerContent}
      </div>

      {/* Scrollable Preview Container */}
      <div className="flex-1 overflow-auto p-4">{previewContent}</div>
    </div>
  );
}
