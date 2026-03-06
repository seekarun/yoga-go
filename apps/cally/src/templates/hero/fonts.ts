/**
 * Shared font utilities for the landing page editor and templates.
 */

import type { FontWeight } from "@/types/landing-page";

/** Available weights per font (from Google Fonts) */
const FONT_WEIGHT_MAP: Record<string, number[]> = {
  "": [100, 200, 300, 400, 500, 600, 700, 800, 900], // System (sans-serif)
  "Inter, sans-serif": [100, 200, 300, 400, 500, 600, 700, 800, 900],
  "Poppins, sans-serif": [100, 200, 300, 400, 500, 600, 700, 800, 900],
  "Roboto, sans-serif": [100, 200, 300, 400, 500, 600, 700, 800, 900],
  "Montserrat, sans-serif": [100, 200, 300, 400, 500, 600, 700, 800, 900],
  "Rubik, sans-serif": [300, 400, 500, 600, 700, 800, 900],
  "Outfit, sans-serif": [100, 200, 300, 400, 500, 600, 700, 800, 900],
  "'DM Sans', sans-serif": [100, 200, 300, 400, 500, 600, 700, 800, 900],
  "'Space Grotesk', sans-serif": [300, 400, 500, 600, 700],
  "'Open Sans', sans-serif": [300, 400, 500, 600, 700, 800],
  "Lato, sans-serif": [100, 300, 400, 700, 900],
  "Nunito, sans-serif": [200, 300, 400, 500, 600, 700, 800, 900],
  "'Work Sans', sans-serif": [100, 200, 300, 400, 500, 600, 700, 800, 900],
  "Quicksand, sans-serif": [300, 400, 500, 600, 700],
  "Barlow, sans-serif": [100, 200, 300, 400, 500, 600, 700, 800, 900],
  "Raleway, sans-serif": [100, 200, 300, 400, 500, 600, 700, 800, 900],
  "'Source Sans 3', sans-serif": [200, 300, 400, 500, 600, 700, 800, 900],
  "'PT Sans', sans-serif": [400, 700],
  "'Playfair Display', serif": [400, 500, 600, 700, 800, 900],
  "Lora, serif": [400, 500, 600, 700],
  "'Merriweather', serif": [300, 400, 700, 900],
  "'Libre Baskerville', serif": [400, 700],
  "'EB Garamond', serif": [400, 500, 600, 700, 800],
  "Fraunces, serif": [100, 200, 300, 400, 500, 600, 700, 800, 900],
  "Georgia, serif": [100, 200, 300, 400, 500, 600, 700, 800, 900], // System font
};

/** Human-readable labels for CSS font-weight values */
export const WEIGHT_LABELS: Record<number, string> = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black",
};

/** Default weights when a font isn't in the map */
const DEFAULT_WEIGHTS = [400, 700];

/** Get available font weights for a font family */
export function getFontWeights(fontFamily: string): number[] {
  return FONT_WEIGHT_MAP[fontFamily] || DEFAULT_WEIGHTS;
}

/** Convert FontWeight ("normal" | "bold" | number) to numeric value */
export function normalizeWeight(w: FontWeight): number {
  if (w === "normal") return 400;
  if (w === "bold") return 700;
  return w;
}

export const FONT_OPTIONS = [
  { value: "", label: "System (sans-serif)" },
  // Clean & Modern (Great for UI/Headings)
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "Poppins, sans-serif", label: "Poppins" },
  { value: "Roboto, sans-serif", label: "Roboto" },
  { value: "Montserrat, sans-serif", label: "Montserrat" },
  { value: "Rubik, sans-serif", label: "Rubik" },
  { value: "Outfit, sans-serif", label: "Outfit" },
  { value: "'DM Sans', sans-serif", label: "DM Sans" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk" },
  // Friendly & Readable (Great for Content/Body)
  { value: "'Open Sans', sans-serif", label: "Open Sans" },
  { value: "Lato, sans-serif", label: "Lato" },
  { value: "Nunito, sans-serif", label: "Nunito" },
  { value: "'Work Sans', sans-serif", label: "Work Sans" },
  { value: "Quicksand, sans-serif", label: "Quicksand" },
  { value: "Barlow, sans-serif", label: "Barlow" },
  { value: "Raleway, sans-serif", label: "Raleway" },
  { value: "'Source Sans 3', sans-serif", label: "Source Sans" },
  { value: "'PT Sans', sans-serif", label: "PT Sans" },
  // Classic & Elegant (Great for Headings/Fashion)
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "Lora, serif", label: "Lora" },
  { value: "'Merriweather', serif", label: "Merriweather" },
  { value: "'Libre Baskerville', serif", label: "Libre Baskerville" },
  { value: "'EB Garamond', serif", label: "EB Garamond" },
  { value: "Fraunces, serif", label: "Fraunces" },
  { value: "Georgia, serif", label: "Georgia" },
];

/** System fonts that don't need Google Fonts loading */
const SYSTEM_FONTS = new Set(["", "Georgia, serif"]);

/** Build a Google Fonts URL for the selected font, loading all available weights */
export function getGoogleFontsUrl(fontFamily: string): string | null {
  if (!fontFamily) return null;
  // Georgia is a system font
  if (fontFamily.startsWith("Georgia")) return null;

  const name = fontFamily.split(",")[0].replace(/'/g, "").trim();
  const encoded = name.replace(/ /g, "+");
  const weights = getFontWeights(fontFamily);
  const wghtParam = weights.join(";");
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@${wghtParam}&display=swap`;
}

export function getAllGoogleFontsUrl(): string {
  const families = FONT_OPTIONS.filter((opt) => !SYSTEM_FONTS.has(opt.value))
    .map((opt) => {
      const name = opt.value.split(",")[0].replace(/'/g, "").trim();
      return name.replace(/ /g, "+");
    })
    .map((encoded) => `family=${encoded}:wght@400;700`);
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}
