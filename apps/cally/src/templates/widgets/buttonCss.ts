import type { WidgetBrandConfig, WidgetButtonStyle } from "./types";
import { getContrastColor } from "@/lib/colorPalette";

/**
 * Generate scoped CSS for a primary-style button from brand config.
 * Falls back to the legacy pattern (primaryColor bg + contrast text) when
 * no explicit button config is provided.
 */
export function primaryBtnCss(
  scope: string,
  cls: string,
  brand: WidgetBrandConfig,
): string {
  const primary = brand.primaryColor;
  const b: WidgetButtonStyle = brand.primaryButton ?? {
    fillColor: primary,
    textColor: getContrastColor(primary),
    borderColor: "transparent",
    borderWidth: 0,
    borderRadius: 8,
  };

  const border =
    b.borderWidth > 0 ? `${b.borderWidth}px solid ${b.borderColor}` : "none";

  return `
    .${scope}-${cls} {
      color: ${b.textColor};
      background: ${b.fillColor};
      border: ${border};
      border-radius: ${b.borderRadius}px;
    }
  `;
}
