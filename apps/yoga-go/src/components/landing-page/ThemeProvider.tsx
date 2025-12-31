'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import type { ColorPalette } from '@/types';
import { DEFAULT_PALETTE, getContrastColor } from '@/lib/colorPalette';
import { DEFAULT_FONT, getGoogleFontsUrl, getFontFamily } from '@/lib/webFonts';

interface LandingPageThemeProviderProps {
  palette?: ColorPalette;
  fontFamily?: string;
  children: ReactNode;
}

/**
 * Provides brand color palette as CSS custom properties to landing page sections.
 *
 * Usage in sections:
 * - var(--brand-500) for primary buttons
 * - var(--brand-600) for hover states
 * - var(--brand-100) for light badges
 * - var(--brand-500-contrast) for text on brand-500 background
 * - var(--brand-secondary) for secondary backgrounds (harmony-based)
 * - var(--brand-highlight) for accent/highlight colors (harmony-based)
 * - etc.
 */
export function LandingPageThemeProvider({
  palette,
  fontFamily,
  children,
}: LandingPageThemeProviderProps) {
  const colors = palette || DEFAULT_PALETTE;
  const font = fontFamily || DEFAULT_FONT;

  // Load Google Font dynamically
  useEffect(() => {
    if (!font) return;

    const linkId = `google-font-${font.replace(/\s+/g, '-')}`;

    // Check if font is already loaded
    if (document.getElementById(linkId)) return;

    const link = document.createElement('link');
    link.id = linkId;
    link.href = getGoogleFontsUrl(font);
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Cleanup on unmount or font change
    return () => {
      const existingLink = document.getElementById(linkId);
      if (existingLink) {
        document.head.removeChild(existingLink);
      }
    };
  }, [font]);

  // Calculate contrast colors for key shades (for text on colored backgrounds)
  const contrast500 = getContrastColor(colors[500]);
  const contrast600 = getContrastColor(colors[600]);

  // Use harmony-based secondary/highlight if available, fallback to shades
  const secondaryColor = colors.secondary || colors[100];
  const highlightColor = colors.highlight || colors[400];

  const style = {
    '--brand-50': colors[50],
    '--brand-100': colors[100],
    '--brand-200': colors[200],
    '--brand-300': colors[300],
    '--brand-400': colors[400],
    '--brand-500': colors[500],
    '--brand-600': colors[600],
    '--brand-700': colors[700],
    '--brand-800': colors[800],
    '--brand-900': colors[900],
    '--brand-950': colors[950],
    // Contrast colors for text on brand backgrounds
    '--brand-500-contrast': contrast500,
    '--brand-600-contrast': contrast600,
    // Harmony-based colors
    '--brand-secondary': secondaryColor,
    '--brand-highlight': highlightColor,
    // Font
    '--font-primary': getFontFamily(font),
    fontFamily: getFontFamily(font),
  } as React.CSSProperties;

  return (
    <div style={style} className="landing-page-theme">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .landing-page-theme,
            .landing-page-theme * {
              font-family: var(--font-primary) !important;
            }
          `,
        }}
      />
      {children}
    </div>
  );
}

export default LandingPageThemeProvider;
