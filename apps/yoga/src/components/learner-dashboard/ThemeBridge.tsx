'use client';

import type { ReactNode } from 'react';

interface ThemeBridgeProps {
  children: ReactNode;
}

/**
 * Bridges the brand color CSS variables to the legacy color-primary variables.
 *
 * The LandingPageThemeProvider sets --brand-* variables (from expert's palette),
 * but existing components use --color-primary. This component maps between them.
 *
 * Usage: Wrap content that needs both brand colors and legacy color support.
 */
export default function ThemeBridge({ children }: ThemeBridgeProps) {
  const style = {
    // Map brand colors to legacy color-primary variables
    '--color-primary': 'var(--brand-500, #7a2900)',
    '--color-primary-light': 'var(--brand-100, #fed094)',
    '--color-highlight': 'var(--brand-600, #8f8e43)',
  } as React.CSSProperties;

  return <div style={style}>{children}</div>;
}
