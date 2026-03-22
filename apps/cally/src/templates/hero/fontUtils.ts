/**
 * Shared typography role resolution utilities.
 *
 * Used by templates and widgets to resolve a TypographyRole to font settings.
 *
 * When a typography role is set, ALL visual properties (family, size, weight,
 * color) are derived from the role — consumers should not add their own
 * per-element fallbacks.
 */

import type { BrandFont, CustomFontType } from "@/types/landing-page";
import type { FontWeight } from "@/types/landing-page";
import type { WidgetBrandConfig } from "@/templates/widgets/types";

/** Default font sizes (px) for each built-in typography role */
export const DEFAULT_ROLE_SIZES: Record<string, number> = {
  header: 48,
  "sub-header": 24,
  body: 16,
};

/** Resolved font values for a typography role (widget-level) */
export interface ResolvedWidgetFont {
  font?: string;
  weight?: FontWeight;
  color?: string;
  size: number;
}

/**
 * Resolve a typography role to font settings from WidgetBrandConfig.
 * Supports built-in roles (header, sub-header, body) and custom roles ("custom:Name").
 * Always returns a `size` — either from the brand config or from role defaults.
 */
export function fontForRole(
  role: string,
  brand: WidgetBrandConfig,
): ResolvedWidgetFont {
  // Custom font type: "custom:Name"
  if (role.startsWith("custom:") && brand.customFontTypes) {
    const name = role.slice(7); // strip "custom:"
    const custom = brand.customFontTypes.find((ft) => ft.name === name);
    if (custom) {
      return {
        font: custom.font.family,
        weight: custom.font.weight,
        color: custom.font.color,
        size: custom.font.size ?? DEFAULT_ROLE_SIZES.body,
      };
    }
    // Fallback to body if custom type not found
  }

  if (role === "header") {
    return {
      font: brand.headerFont,
      weight: brand.headerFontWeight,
      color: brand.headerFontColor,
      size: brand.headerFontSize ?? DEFAULT_ROLE_SIZES.header,
    };
  }
  if (role === "sub-header") {
    return {
      font: brand.subHeaderFont ?? brand.headerFont,
      weight: brand.subHeaderFontWeight ?? brand.headerFontWeight,
      color: brand.subHeaderFontColor ?? brand.headerFontColor,
      size:
        brand.subHeaderFontSize ??
        brand.headerFontSize ??
        DEFAULT_ROLE_SIZES["sub-header"],
    };
  }
  // Default: body
  return {
    font: brand.bodyFont,
    weight: brand.bodyFontWeight,
    color: brand.bodyFontColor,
    size: brand.bodyFontSize ?? DEFAULT_ROLE_SIZES.body,
  };
}

/**
 * Resolve a typography role to a BrandFont from theme settings.
 * Always returns a BrandFont with `size` populated (from theme or role default).
 */
export function fontForRoleFromTheme(
  role: string,
  theme?: {
    headerFont?: BrandFont;
    subHeaderFont?: BrandFont;
    bodyFont?: BrandFont;
  },
  customFontTypes?: CustomFontType[],
): BrandFont {
  const defaultSize = DEFAULT_ROLE_SIZES[role] ?? DEFAULT_ROLE_SIZES.body;

  // Custom font type: "custom:Name"
  if (role.startsWith("custom:") && customFontTypes) {
    const name = role.slice(7);
    const custom = customFontTypes.find((ft) => ft.name === name);
    if (custom)
      return { ...custom.font, size: custom.font.size ?? defaultSize };
    // Fallback to body if not found
  }

  let font: BrandFont | undefined;
  if (role === "header") font = theme?.headerFont;
  else if (role === "sub-header")
    font = theme?.subHeaderFont ?? theme?.headerFont;
  else font = theme?.bodyFont;

  if (!font) return { family: "", size: defaultSize };
  return { ...font, size: font.size ?? defaultSize };
}
