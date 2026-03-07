/**
 * Section Theme — light/dark color palettes for widget components.
 *
 * Widgets call `getSectionTheme(brand.colorMode)` and use the returned
 * semantic colors as fallbacks instead of hardcoded light-mode values.
 */

export interface SectionTheme {
  mode: "light" | "dark";
  /** Heading text color (#1a1a1a / #ffffff) */
  heading: string;
  /** Body text color (#4b5563 / #d1d5db) */
  body: string;
  /** Muted/secondary text (#9ca3af / #9ca3af) */
  muted: string;
  /** Section / card background (#ffffff / #111111) */
  bg: string;
  /** Alternate surface (light gray / dark gray) (#f9fafb / #1a1a1a) */
  surfaceAlt: string;
  /** Border color (#e5e7eb / #374151) */
  border: string;
  /** Icon/badge background (#f3f4f6 / #262626) */
  iconBg: string;
}

const LIGHT: SectionTheme = {
  mode: "light",
  heading: "#1a1a1a",
  body: "#4b5563",
  muted: "#9ca3af",
  bg: "#ffffff",
  surfaceAlt: "#f9fafb",
  border: "#e5e7eb",
  iconBg: "#f3f4f6",
};

const DARK: SectionTheme = {
  mode: "dark",
  heading: "#ffffff",
  body: "#d1d5db",
  muted: "#9ca3af",
  bg: "#111111",
  surfaceAlt: "#1a1a1a",
  border: "#374151",
  iconBg: "#262626",
};

export function getSectionTheme(mode?: "light" | "dark"): SectionTheme {
  return mode === "dark" ? DARK : LIGHT;
}
