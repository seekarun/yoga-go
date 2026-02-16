"use client";

import type { ReactNode } from "react";
import type { ColorPalette } from "@/lib/colorPalette";
import type { BrandFont } from "@/types/landing-page";
import { DEFAULT_PALETTE, getContrastColor } from "@/lib/colorPalette";
import { getGoogleFontsUrl } from "./fonts";

interface LandingPageThemeProviderProps {
  palette?: ColorPalette;
  headerFont?: BrandFont;
  bodyFont?: BrandFont;
  children: ReactNode;
}

/**
 * Provides brand color palette as CSS custom properties to landing page sections.
 * Also loads Google Fonts for brand header/body fonts when set.
 *
 * Usage in sections:
 * - var(--brand-500) for primary buttons
 * - var(--brand-600) for hover states
 * - var(--brand-500-contrast) for text on brand-500 background
 */
export function LandingPageThemeProvider({
  palette,
  headerFont,
  bodyFont,
  children,
}: LandingPageThemeProviderProps) {
  // Collect Google Fonts links to load
  const fontLinks: string[] = [];
  if (headerFont?.family) {
    const url = getGoogleFontsUrl(headerFont.family);
    if (url) fontLinks.push(url);
  }
  if (bodyFont?.family) {
    const url = getGoogleFontsUrl(bodyFont.family);
    if (url && !fontLinks.includes(url)) fontLinks.push(url);
  }

  if (!palette && fontLinks.length === 0) {
    return <>{children}</>;
  }

  const colors = palette || DEFAULT_PALETTE;

  const contrast500 = palette ? getContrastColor(colors[500]) : undefined;
  const contrast600 = palette ? getContrastColor(colors[600]) : undefined;

  const secondaryColor = palette ? colors.secondary || colors[100] : undefined;
  const highlightColor = palette ? colors.highlight || colors[400] : undefined;

  const style = {
    ...(palette
      ? {
          "--brand-50": colors[50],
          "--brand-100": colors[100],
          "--brand-200": colors[200],
          "--brand-300": colors[300],
          "--brand-400": colors[400],
          "--brand-500": colors[500],
          "--brand-600": colors[600],
          "--brand-700": colors[700],
          "--brand-800": colors[800],
          "--brand-900": colors[900],
          "--brand-950": colors[950],
          "--brand-500-contrast": contrast500,
          "--brand-600-contrast": contrast600,
          "--brand-secondary": secondaryColor,
          "--brand-highlight": highlightColor,
        }
      : {}),
  } as React.CSSProperties;

  return (
    <div style={style} className="landing-page-theme">
      {fontLinks.map((url) => (
        <link key={url} rel="stylesheet" href={url} />
      ))}
      {children}
    </div>
  );
}

export default LandingPageThemeProvider;
