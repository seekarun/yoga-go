/**
 * Widget System Types
 *
 * Widgets are pure visual rendering components that receive data and brand config.
 * They don't handle editing — that's the section component's job.
 * Templates pick which widget variant to use for each section.
 */

import type { SectionId } from "@/types/landing-page";

/**
 * Brand configuration passed to every widget for style-ability.
 * Derived from the tenant's theme settings.
 */
export interface WidgetBrandConfig {
  /** Primary brand colour, e.g. "#8B6F4E" */
  primaryColor: string;
  /** Secondary/lighter brand colour for badges, accents, e.g. palette[200] */
  secondaryColor?: string;
  /** Header/display font family, e.g. "'Playfair Display', serif" */
  headerFont?: string;
  /** Body/paragraph font family, e.g. "'Inter', sans-serif" */
  bodyFont?: string;
}

/**
 * Section types that support widgets.
 * Combines SectionId subsets with top-level template sections (hero, footer, etc.).
 */
export type WidgetSectionType =
  | Extract<SectionId, "testimonials" | "products">
  | "hero";

/**
 * Metadata for a single widget variant.
 */
export interface WidgetEntry {
  /** Unique widget ID (scoped per section, e.g. "card-matrix-3x2") */
  id: string;
  /** Human-readable display name shown in the editor */
  name: string;
  /** Short description of the layout/style */
  description: string;
  /** Which section type this widget belongs to */
  section: WidgetSectionType;
  /** Max items this widget is designed for (informational) */
  maxItems?: number;
}

/**
 * The global widget catalogue — all available widgets grouped by section.
 */
export type WidgetCatalogue = Record<WidgetSectionType, WidgetEntry[]>;
