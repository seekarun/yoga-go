// Theme colors matching cally web app globals.css
export const colors = {
  // Brand Colors
  primary: "#6366f1", // Indigo (Buttons/CTAs)
  primaryHover: "#4f46e5", // Darker indigo
  secondary: "#818cf8", // Lighter indigo (Accents)

  // Neutral Surfaces
  bgMain: "#f9fafb", // Page background
  surface: "#ffffff", // Card/Modal background
  border: "#e5e7eb", // Subtle dividers

  // Typography
  textMain: "#111827", // Headings
  textBody: "#374151", // Paragraphs
  textMuted: "#6b7280", // Labels/Captions

  // Utility
  white: "#ffffff",
  error: "#ef4444",
  errorBg: "#fef2f2",
  success: "#22c55e",
  warning: "#f59e0b",
  warningBg: "#fffbeb",
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
  xl: 16,
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
