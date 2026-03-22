"use client";

import type { HeroTemplateProps } from "./types";
import PlaygroundTemplate from "./PlaygroundTemplate";

/**
 * Hero Template Renderer
 * Routes to the correct template based on config.template.
 * Falls back to PlaygroundTemplate for any unknown template IDs.
 */
export default function HeroTemplateRenderer(props: HeroTemplateProps) {
  return <PlaygroundTemplate {...props} />;
}

// Re-export individual templates for direct use
export { PlaygroundTemplate };
