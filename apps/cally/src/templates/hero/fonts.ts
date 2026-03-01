/**
 * Shared font utilities for the landing page editor and templates.
 */

export const FONT_OPTIONS = [
  { value: "", label: "System (sans-serif)" },
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "'Open Sans', sans-serif", label: "Open Sans" },
  { value: "Lato, sans-serif", label: "Lato" },
  { value: "Roboto, sans-serif", label: "Roboto" },
  { value: "Poppins, sans-serif", label: "Poppins" },
  { value: "Montserrat, sans-serif", label: "Montserrat" },
  { value: "Raleway, sans-serif", label: "Raleway" },
  { value: "Nunito, sans-serif", label: "Nunito" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Lora, serif", label: "Lora" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'Merriweather', serif", label: "Merriweather" },
  { value: "'Libre Baskerville', serif", label: "Libre Baskerville" },
  { value: "'DM Sans', sans-serif", label: "DM Sans" },
  { value: "'Source Sans 3', sans-serif", label: "Source Sans" },
  { value: "'PT Sans', sans-serif", label: "PT Sans" },
  { value: "'Work Sans', sans-serif", label: "Work Sans" },
];

/** Build a Google Fonts URL for the selected font (skip system/Georgia which don't need loading) */
export function getGoogleFontsUrl(fontFamily: string): string | null {
  if (!fontFamily) return null;
  // Georgia is a system font
  if (fontFamily.startsWith("Georgia")) return null;

  // Extract the font name (first entry before comma)
  const name = fontFamily.split(",")[0].replace(/'/g, "").trim();
  const encoded = name.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700&display=swap`;
}

/** System fonts that don't need Google Fonts loading */
const SYSTEM_FONTS = new Set(["", "Georgia, serif"]);

/** Collect Google Font CSS URLs for all unique fontFamily values in spans. */
export function getSpanFontUrls(spans?: { fontFamily?: string }[]): string[] {
  if (!spans || spans.length === 0) return [];
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const span of spans) {
    if (span.fontFamily && !seen.has(span.fontFamily)) {
      seen.add(span.fontFamily);
      const url = getGoogleFontsUrl(span.fontFamily);
      if (url) urls.push(url);
    }
  }
  return urls;
}

/** Build a Google Fonts URL that loads ALL non-system fonts for dropdown preview */
export function getAllGoogleFontsUrl(): string {
  const families = FONT_OPTIONS.filter((opt) => !SYSTEM_FONTS.has(opt.value))
    .map((opt) => {
      const name = opt.value.split(",")[0].replace(/'/g, "").trim();
      return name.replace(/ /g, "+");
    })
    .map((encoded) => `family=${encoded}:wght@400;700`);
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}
