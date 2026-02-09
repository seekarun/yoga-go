/**
 * Color Palette Generator
 *
 * Generates an 11-shade color palette from a single primary color.
 * Uses HSL color space for natural-looking tints and shades.
 */

// Color harmony types for palette generation
export type ColorHarmonyType = "analogous" | "triadic" | "split-complementary";

// Shade keys for the base palette (50-950)
export type ShadeKey =
  | 50
  | 100
  | 200
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900
  | 950;

export interface ColorPalette {
  50: string; // Lightest - subtle backgrounds
  100: string; // Light backgrounds, badges
  200: string; // Light accents
  300: string; // Hover borders
  400: string; // Secondary elements
  500: string; // Base/Primary - buttons, main CTA
  600: string; // Hover state
  700: string; // Active state
  800: string; // Dark accents
  900: string; // Dark text
  950: string; // Darkest
  // Harmony-based colors
  secondary?: string; // Secondary color based on harmony
  highlight?: string; // Highlight/accent color based on harmony
  harmonyType?: ColorHarmonyType; // Which harmony was used
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Convert hex color to HSL
 */
export function hexToHsl(hex: string): HSL {
  hex = hex.replace(/^#/, "");

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to hex color
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate a shade at a specific lightness level
 */
function generateShade(hsl: HSL, targetLightness: number): string {
  let adjustedSaturation = hsl.s;

  if (targetLightness > 80) {
    adjustedSaturation = Math.max(10, hsl.s * 0.3);
  } else if (targetLightness > 60) {
    adjustedSaturation = Math.max(20, hsl.s * 0.6);
  } else if (targetLightness < 20) {
    adjustedSaturation = Math.min(100, hsl.s * 1.1);
  }

  return hslToHex(hsl.h, adjustedSaturation, targetLightness);
}

/**
 * Generate a complete 11-shade palette from a primary color
 */
export function generatePalette(hexColor: string): ColorPalette {
  const hsl = hexToHsl(hexColor);

  const lightnessValues: Record<ShadeKey, number> = {
    50: 97,
    100: 94,
    200: 88,
    300: 78,
    400: 65,
    500: hsl.l,
    600: Math.max(10, hsl.l - 10),
    700: Math.max(10, hsl.l - 20),
    800: Math.max(8, hsl.l - 30),
    900: Math.max(6, hsl.l - 38),
    950: Math.max(4, hsl.l - 44),
  };

  return {
    50: generateShade(hsl, lightnessValues[50]),
    100: generateShade(hsl, lightnessValues[100]),
    200: generateShade(hsl, lightnessValues[200]),
    300: generateShade(hsl, lightnessValues[300]),
    400: generateShade(hsl, lightnessValues[400]),
    500: hexColor,
    600: generateShade(hsl, lightnessValues[600]),
    700: generateShade(hsl, lightnessValues[700]),
    800: generateShade(hsl, lightnessValues[800]),
    900: generateShade(hsl, lightnessValues[900]),
    950: generateShade(hsl, lightnessValues[950]),
  };
}

/**
 * Default palette using teal (#2A9D8F)
 */
export const DEFAULT_PALETTE: ColorPalette = generatePalette("#2A9D8F");

/**
 * Calculate relative luminance of a color (0-1)
 */
export function getLuminance(hexColor: string): number {
  const hex = hexColor.replace(/^#/, "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

const BRIGHTNESS_THRESHOLD = 0.5;

/**
 * Get a contrasting text color (dark or light) for a given background
 */
export function getContrastColor(hexColor: string): string {
  const luminance = getLuminance(hexColor);
  return luminance > BRIGHTNESS_THRESHOLD ? "#111827" : "#ffffff";
}

/**
 * Generate harmony-based secondary and highlight colors
 */
export function getHarmonyColors(
  hexColor: string,
  harmony: ColorHarmonyType,
): { secondary: string; highlight: string } {
  const hsl = hexToHsl(hexColor);

  switch (harmony) {
    case "analogous": {
      const secondary = hslToHex(
        (hsl.h + 30) % 360,
        Math.max(30, hsl.s * 0.6),
        85,
      );
      const highlight = hslToHex(
        (hsl.h - 30 + 360) % 360,
        Math.max(40, hsl.s * 0.7),
        75,
      );
      return { secondary, highlight };
    }
    case "triadic": {
      const secondary = hslToHex(
        (hsl.h + 120) % 360,
        Math.max(30, hsl.s * 0.5),
        85,
      );
      const highlight = hslToHex(
        (hsl.h + 240) % 360,
        Math.max(40, hsl.s * 0.7),
        75,
      );
      return { secondary, highlight };
    }
    case "split-complementary": {
      const secondary = hslToHex(
        (hsl.h + 150) % 360,
        Math.max(30, hsl.s * 0.5),
        85,
      );
      const highlight = hslToHex(
        (hsl.h + 210) % 360,
        Math.max(40, hsl.s * 0.7),
        75,
      );
      return { secondary, highlight };
    }
  }
}

/**
 * Harmony options for UI display
 */
export const HARMONY_OPTIONS: {
  type: ColorHarmonyType;
  label: string;
  description: string;
}[] = [
  { type: "analogous", label: "Analogous", description: "Calm & unified" },
  { type: "triadic", label: "Triadic", description: "Vibrant & balanced" },
  {
    type: "split-complementary",
    label: "Split-Comp",
    description: "Sophisticated contrast",
  },
];

/**
 * Validate hex color format
 */
export function isValidHexColor(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}
