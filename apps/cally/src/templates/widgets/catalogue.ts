/**
 * Global Widget Catalogue
 *
 * Central registry of all available widgets, grouped by section type.
 * Templates and the editor reference this to discover and select widgets.
 *
 * To add a new widget:
 * 1. Create the component in widgets/<section>/<WidgetName>.tsx
 * 2. Add an entry here in the appropriate section array
 * 3. Register the component in WIDGET_COMPONENTS below
 * 4. Re-export from widgets/index.ts
 */

import type { WidgetCatalogue, WidgetEntry } from "./types";

/**
 * The catalogue — single source of truth for all available widgets.
 */
export const WIDGET_CATALOGUE: WidgetCatalogue = {
  testimonials: [
    {
      id: "card-matrix-3x2",
      name: "3x2 Card Matrix",
      description:
        "Clean 3-column grid with quote icons, author avatars, and drop-shadow cards. Shows up to 6 testimonials.",
      section: "testimonials",
      maxItems: 6,
    },
    {
      id: "solid-cards",
      name: "Solid Cards",
      description:
        "Dark solid-background cards with author at top, star rating, and quote. 2-column grid derived from brand colour.",
      section: "testimonials",
      maxItems: 6,
    },
    {
      id: "animated-single-card",
      name: "Animated Single Card",
      description:
        "Single card that cycles through testimonials with fade transitions. Clickable author avatars below to select.",
      section: "testimonials",
    },
    {
      id: "animated-scrambled-cards",
      name: "Animated Scrambled Cards",
      description:
        "Dark carousel with slightly rotated cards, edge fade, and arrow navigation. Shows 2 cards on desktop, 1 on mobile.",
      section: "testimonials",
      maxItems: 6,
    },
    {
      id: "card-uneven-grid",
      name: "Card Uneven Grid",
      description:
        "Dark featured card spanning 2 rows on the left with 4 lighter cards in a 2×2 grid. Shows up to 5 testimonials.",
      section: "testimonials",
      maxItems: 5,
    },
    {
      id: "animated-card-scroll",
      name: "Animated Card Scroll",
      description:
        "Horizontal carousel where the focused card scales up and side cards shrink. Arrow buttons, dot indicators, auto-slides.",
      section: "testimonials",
      maxItems: 6,
    },
  ],
  products: [
    {
      id: "static-vertical",
      name: "Static Vertical",
      description:
        "Clean vertical cards with large image carousel, product name, description, price, and Book Now button. Responsive grid layout.",
      section: "products",
    },
    {
      id: "static-ecom",
      name: "Static Ecom",
      description:
        "E-commerce style cards with square image, duration badge, floating action icon, product name, description, and full-width Book Now button.",
      section: "products",
    },
    {
      id: "static-horizontal",
      name: "Static Horizontal",
      description:
        "Full-width horizontal cards stacked vertically. Image and text side by side, alternating left/right per card.",
      section: "products",
    },
  ],
  hero: [
    {
      id: "video-horizontal",
      name: "Video Horizontal",
      description:
        "Full-width hero with 4 looping videos played one at a time with crossfade. Dark overlay with centered title, subtitle, and CTA.",
      section: "hero",
    },
    {
      id: "stats-boxes",
      name: "Stats Boxes",
      description:
        "Split-layout hero with title, subtitle, and CTA on the left. Right side has a 2x2 bento grid with an image tile and stat boxes.",
      section: "hero",
    },
    {
      id: "pov-cards",
      name: "POV Cards",
      description:
        "Centered hero over a soft lavender-to-cream gradient with three fanned question cards at the bottom. Subtle grid overlay and bottom border.",
      section: "hero",
    },
    {
      id: "doctor-profile",
      name: "Doctor Profile",
      description:
        "Split layout with a light text card on the left and a large portrait image with name card on the right. Social proof row and arrow CTA.",
      section: "hero",
    },
    {
      id: "vertical-image-scroll",
      name: "Vertical Image Scroll",
      description:
        "Split layout with title and CTA on the left. Right side has a column of gallery images scrolling upward with top/bottom fade.",
      section: "hero",
    },
  ],
};

/**
 * Get all widgets for a given section type.
 */
export function getWidgetsForSection(
  section: keyof WidgetCatalogue,
): WidgetEntry[] {
  return WIDGET_CATALOGUE[section] || [];
}

/**
 * Get a specific widget entry by section + widget ID.
 */
export function getWidget(
  section: keyof WidgetCatalogue,
  widgetId: string,
): WidgetEntry | undefined {
  return WIDGET_CATALOGUE[section]?.find((w) => w.id === widgetId);
}

/**
 * Get the default widget ID for a section (first in the list).
 */
export function getDefaultWidgetId(
  section: keyof WidgetCatalogue,
): string | undefined {
  return WIDGET_CATALOGUE[section]?.[0]?.id;
}
