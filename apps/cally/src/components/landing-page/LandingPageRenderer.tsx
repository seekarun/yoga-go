"use client";

import type { SimpleLandingPageConfig } from "@/types/landing-page";
import HeroTemplateRenderer from "@/templates/hero";

interface LandingPageRendererProps {
  config: SimpleLandingPageConfig;
}

/**
 * Public landing page renderer
 * Renders the selected template without edit mode
 */
export default function LandingPageRenderer({
  config,
}: LandingPageRendererProps) {
  return <HeroTemplateRenderer config={config} isEditing={false} />;
}
