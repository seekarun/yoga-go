/**
 * Template types for Cally landing pages
 * Simplified to support the 5 hero templates
 */

import type { SimpleLandingPageConfig, TemplateId } from "@/types/landing-page";

// Re-export for convenience
export type { SimpleLandingPageConfig, TemplateId };

/**
 * Props for individual hero template components
 */
export interface HeroTemplateProps {
  config: SimpleLandingPageConfig;
  isEditing?: boolean;
  onTitleChange?: (title: string) => void;
  onSubtitleChange?: (subtitle: string) => void;
}
