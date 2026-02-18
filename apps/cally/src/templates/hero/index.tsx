"use client";

import type { TemplateId } from "@/types/landing-page";
import type { HeroTemplateProps } from "./types";
import CenteredTemplate from "./CenteredTemplate";
import SplitTemplate from "./SplitTemplate";
import AppleTemplate from "./AppleTemplate";
import BaysideTemplate from "./BaysideTemplate";
import TherapistTemplate from "./TherapistTemplate";
import ParallaxTemplate from "./ParallaxTemplate";
import AnimatedTemplate from "./AnimatedTemplate";
import DIYTemplate from "./DIYTemplate";
import FreeformTemplate from "./FreeformTemplate";

/**
 * Template registry mapping template IDs to their components
 */
const TEMPLATE_COMPONENTS: Record<TemplateId, React.FC<HeroTemplateProps>> = {
  centered: CenteredTemplate,
  split: SplitTemplate,
  apple: AppleTemplate,
  bayside: BaysideTemplate,
  therapist: TherapistTemplate,
  parallax: ParallaxTemplate,
  animated: AnimatedTemplate,
  diy: DIYTemplate,
  freeform: FreeformTemplate,
};

/**
 * Hero Template Renderer
 * Renders the appropriate template based on the config, passing all props through
 */
export default function HeroTemplateRenderer(props: HeroTemplateProps) {
  const TemplateComponent =
    TEMPLATE_COMPONENTS[props.config.template] || CenteredTemplate;

  return <TemplateComponent {...props} />;
}

// Re-export individual templates for direct use
export {
  CenteredTemplate,
  SplitTemplate,
  AppleTemplate,
  BaysideTemplate,
  TherapistTemplate,
  ParallaxTemplate,
  AnimatedTemplate,
  DIYTemplate,
  FreeformTemplate,
};
