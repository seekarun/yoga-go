// Theme colors matching webapp globals.css
export const colors = {
  // Brand Colors
  primary: "#a35638", // Terracotta (Buttons/CTAs)
  primaryHover: "#8b482e", // Darkened Terracotta
  secondary: "#e08963", // Soft Clay (Accents)
  highlight: "#7d8e74", // Sage (Success/Growth indicators)

  // Neutral Surfaces
  bgMain: "#fbf7f0", // Page background
  surface: "#ffffff", // Card/Modal background
  border: "#e8e2d6", // Subtle dividers

  // Typography
  textMain: "#2d2621", // Headings
  textBody: "#4a443f", // Paragraphs
  textMuted: "#7d756d", // Labels/Captions

  // Utility
  white: "#ffffff",
  error: "#c33",
  errorBg: "#fee",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 36,
};

export const fontWeight = {
  light: "200" as const,
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};
