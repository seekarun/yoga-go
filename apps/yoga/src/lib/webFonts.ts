/**
 * Web Fonts - Curated list of Google Fonts for landing page customization
 */

export interface WebFont {
  value: string;
  label: string;
  category: 'sans-serif' | 'serif' | 'display';
}

export const WEB_FONTS: WebFont[] = [
  // Sans-Serif (~20)
  { value: 'Inter', label: 'Inter', category: 'sans-serif' },
  { value: 'Roboto', label: 'Roboto', category: 'sans-serif' },
  { value: 'Open Sans', label: 'Open Sans', category: 'sans-serif' },
  { value: 'Lato', label: 'Lato', category: 'sans-serif' },
  { value: 'Poppins', label: 'Poppins', category: 'sans-serif' },
  { value: 'Montserrat', label: 'Montserrat', category: 'sans-serif' },
  { value: 'Nunito', label: 'Nunito', category: 'sans-serif' },
  { value: 'Raleway', label: 'Raleway', category: 'sans-serif' },
  { value: 'Work Sans', label: 'Work Sans', category: 'sans-serif' },
  { value: 'Outfit', label: 'Outfit', category: 'sans-serif' },
  { value: 'DM Sans', label: 'DM Sans', category: 'sans-serif' },
  { value: 'Manrope', label: 'Manrope', category: 'sans-serif' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', category: 'sans-serif' },
  { value: 'Nunito Sans', label: 'Nunito Sans', category: 'sans-serif' },
  { value: 'Source Sans 3', label: 'Source Sans 3', category: 'sans-serif' },
  { value: 'Rubik', label: 'Rubik', category: 'sans-serif' },
  { value: 'Karla', label: 'Karla', category: 'sans-serif' },
  { value: 'Quicksand', label: 'Quicksand', category: 'sans-serif' },
  { value: 'Cabin', label: 'Cabin', category: 'sans-serif' },
  { value: 'Mulish', label: 'Mulish', category: 'sans-serif' },

  // Serif (~12)
  { value: 'Playfair Display', label: 'Playfair Display', category: 'serif' },
  { value: 'Merriweather', label: 'Merriweather', category: 'serif' },
  { value: 'Lora', label: 'Lora', category: 'serif' },
  { value: 'Source Serif 4', label: 'Source Serif 4', category: 'serif' },
  { value: 'Libre Baskerville', label: 'Libre Baskerville', category: 'serif' },
  { value: 'Crimson Text', label: 'Crimson Text', category: 'serif' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond', category: 'serif' },
  { value: 'EB Garamond', label: 'EB Garamond', category: 'serif' },
  { value: 'Bitter', label: 'Bitter', category: 'serif' },
  { value: 'Spectral', label: 'Spectral', category: 'serif' },
  { value: 'Cardo', label: 'Cardo', category: 'serif' },
  { value: 'PT Serif', label: 'PT Serif', category: 'serif' },

  // Display (~6)
  { value: 'Abril Fatface', label: 'Abril Fatface', category: 'display' },
  { value: 'Bebas Neue', label: 'Bebas Neue', category: 'display' },
  { value: 'Oswald', label: 'Oswald', category: 'display' },
  { value: 'Archivo Black', label: 'Archivo Black', category: 'display' },
  { value: 'Righteous', label: 'Righteous', category: 'display' },
  { value: 'Anton', label: 'Anton', category: 'display' },
];

export const DEFAULT_FONT = 'Inter';

// Get Google Fonts URL for a single font
export const getGoogleFontsUrl = (fontFamily: string): string => {
  const encoded = fontFamily.replace(/ /g, '+');
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700;800&display=swap`;
};

// Get font category fallback
export const getFontFallback = (fontFamily: string): string => {
  const font = WEB_FONTS.find(f => f.value === fontFamily);
  if (!font) return 'sans-serif';
  return font.category === 'display' ? 'sans-serif' : font.category;
};

// Get full font-family CSS value
export const getFontFamily = (fontFamily: string): string => {
  const fallback = getFontFallback(fontFamily);
  return `'${fontFamily}', ${fallback}`;
};
