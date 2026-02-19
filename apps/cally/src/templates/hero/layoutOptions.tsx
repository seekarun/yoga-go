"use client";

/**
 * Shared layout option constants for SectionToolbar.
 */

/** Hero content alignment layout options */
export const HERO_LAYOUT_OPTIONS: {
  value: string;
  title: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "left",
    title: "Align left",
    icon: (
      <svg
        width="16"
        height="14"
        viewBox="0 0 16 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <line x1="1" y1="3" x2="12" y2="3" />
        <line x1="1" y1="7" x2="9" y2="7" />
        <line x1="1" y1="11" x2="11" y2="11" />
      </svg>
    ),
  },
  {
    value: "center",
    title: "Align center",
    icon: (
      <svg
        width="16"
        height="14"
        viewBox="0 0 16 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <line x1="2" y1="3" x2="14" y2="3" />
        <line x1="4" y1="7" x2="12" y2="7" />
        <line x1="3" y1="11" x2="13" y2="11" />
      </svg>
    ),
  },
  {
    value: "right",
    title: "Align right",
    icon: (
      <svg
        width="16"
        height="14"
        viewBox="0 0 16 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <line x1="4" y1="3" x2="15" y2="3" />
        <line x1="7" y1="7" x2="15" y2="7" />
        <line x1="5" y1="11" x2="15" y2="11" />
      </svg>
    ),
  },
];

/**
 * Map a bgFilter name to a CSS filter() value.
 * The blur() portion is handled separately via bgBlur; this only returns
 * the colour/effect filter for the preset.
 */
export function bgFilterToCSS(filterName?: string): string | undefined {
  switch (filterName) {
    case "grayscale":
      return "grayscale(100%)";
    case "sepia":
      return "sepia(100%)";
    case "saturate":
      return "saturate(200%)";
    case "contrast":
      return "contrast(150%)";
    case "brightness":
      return "brightness(130%)";
    case "invert":
      return "invert(100%)";
    case "hue-rotate":
      return "hue-rotate(90deg)";
    default:
      return undefined;
  }
}

/** About section layout options */
export const ABOUT_LAYOUT_OPTIONS: {
  value: string;
  title: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "image-left",
    title: "Image left",
    icon: (
      <svg
        width="16"
        height="14"
        viewBox="0 0 16 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <rect x="1" y="2" width="6" height="10" rx="1" />
        <line x1="9.5" y1="3" x2="15" y2="3" />
        <line x1="9.5" y1="6" x2="15" y2="6" />
        <line x1="9.5" y1="9" x2="13" y2="9" />
      </svg>
    ),
  },
  {
    value: "image-right",
    title: "Image right",
    icon: (
      <svg
        width="16"
        height="14"
        viewBox="0 0 16 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <rect x="9" y="2" width="6" height="10" rx="1" />
        <line x1="1" y1="3" x2="6.5" y2="3" />
        <line x1="1" y1="6" x2="6.5" y2="6" />
        <line x1="1" y1="9" x2="4.5" y2="9" />
      </svg>
    ),
  },
  {
    value: "stacked",
    title: "Stacked",
    icon: (
      <svg
        width="16"
        height="14"
        viewBox="0 0 16 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <rect x="4" y="1" width="8" height="5" rx="1" />
        <line x1="3" y1="9" x2="13" y2="9" />
        <line x1="4" y1="12" x2="12" y2="12" />
      </svg>
    ),
  },
];
