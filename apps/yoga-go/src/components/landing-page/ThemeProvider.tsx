'use client';

import type { ReactNode } from 'react';
import type { ColorPalette } from '@/types';
import { DEFAULT_PALETTE, getContrastColor } from '@/lib/colorPalette';

interface LandingPageThemeProviderProps {
  palette?: ColorPalette;
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
export function LandingPageThemeProvider({ palette, children }: LandingPageThemeProviderProps) {
  const colors = palette || DEFAULT_PALETTE;

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
  } as React.CSSProperties;

  return <div style={style}>{children}</div>;
}

export default LandingPageThemeProvider;
