"use client";

import type { HeroTemplateProps } from "./types";
import CenteredTemplate from "./CenteredTemplate";
import SalonTemplate from "./SalonTemplate";
import PlaygroundTemplate from "./PlaygroundTemplate";

/**
 * Hero Template Renderer
 * Routes to the correct template based on config.template.
 * Falls back to CenteredTemplate for any unknown template IDs.
 */
export default function HeroTemplateRenderer(props: HeroTemplateProps) {
  switch (props.config.template) {
    case "salon":
      return <SalonTemplate {...props} />;
    case "playground":
      return <PlaygroundTemplate {...props} />;
    default:
      return <CenteredTemplate {...props} />;
  }
}

// Re-export individual templates for direct use
export { CenteredTemplate, SalonTemplate, PlaygroundTemplate };
