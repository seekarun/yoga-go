/**
 * Hero Template Types
 */

import type { SimpleLandingPageConfig } from "@/types/landing-page";

export interface HeroTemplateProps {
  config: SimpleLandingPageConfig;
  isEditing?: boolean;
  onTitleChange?: (title: string) => void;
  onSubtitleChange?: (subtitle: string) => void;
  onButtonClick?: () => void;
  onAboutParagraphChange?: (paragraph: string) => void;
  onAboutImageClick?: () => void;
  onFeaturesHeadingChange?: (heading: string) => void;
  onFeaturesSubheadingChange?: (subheading: string) => void;
  onFeatureCardChange?: (
    cardId: string,
    field: "title" | "description",
    value: string,
  ) => void;
  onFeatureCardImageClick?: (cardId: string) => void;
  onAddFeatureCard?: () => void;
  onRemoveFeatureCard?: (cardId: string) => void;
}

export type HeroTemplateComponent = React.FC<HeroTemplateProps>;

export interface TemplateRegistry {
  [key: string]: HeroTemplateComponent;
}
