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
