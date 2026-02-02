"use client";

import type { TemplateId, SimpleLandingPageConfig } from "@/types/landing-page";
import type { HeroTemplateProps } from "./types";
import CenteredTemplate from "./CenteredTemplate";
import LeftAlignedTemplate from "./LeftAlignedTemplate";
import SplitTemplate from "./SplitTemplate";
import MinimalTemplate from "./MinimalTemplate";
import BoldTemplate from "./BoldTemplate";

/**
 * Template registry mapping template IDs to their components
 */
const TEMPLATE_COMPONENTS: Record<TemplateId, React.FC<HeroTemplateProps>> = {
  centered: CenteredTemplate,
  "left-aligned": LeftAlignedTemplate,
  split: SplitTemplate,
  minimal: MinimalTemplate,
  bold: BoldTemplate,
};

interface HeroTemplateRendererProps {
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

/**
 * Hero Template Renderer
 * Renders the appropriate template based on the config
 */
export default function HeroTemplateRenderer({
  config,
  isEditing = false,
  onTitleChange,
  onSubtitleChange,
  onButtonClick,
  onAboutParagraphChange,
  onAboutImageClick,
  onFeaturesHeadingChange,
  onFeaturesSubheadingChange,
  onFeatureCardChange,
  onFeatureCardImageClick,
  onAddFeatureCard,
  onRemoveFeatureCard,
}: HeroTemplateRendererProps) {
  const TemplateComponent =
    TEMPLATE_COMPONENTS[config.template] || CenteredTemplate;

  return (
    <TemplateComponent
      config={config}
      isEditing={isEditing}
      onTitleChange={onTitleChange}
      onSubtitleChange={onSubtitleChange}
      onButtonClick={onButtonClick}
      onAboutParagraphChange={onAboutParagraphChange}
      onAboutImageClick={onAboutImageClick}
      onFeaturesHeadingChange={onFeaturesHeadingChange}
      onFeaturesSubheadingChange={onFeaturesSubheadingChange}
      onFeatureCardChange={onFeatureCardChange}
      onFeatureCardImageClick={onFeatureCardImageClick}
      onAddFeatureCard={onAddFeatureCard}
      onRemoveFeatureCard={onRemoveFeatureCard}
    />
  );
}

// Re-export individual templates for direct use
export {
  CenteredTemplate,
  LeftAlignedTemplate,
  SplitTemplate,
  MinimalTemplate,
  BoldTemplate,
};
