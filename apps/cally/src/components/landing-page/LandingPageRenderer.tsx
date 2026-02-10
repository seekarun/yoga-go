"use client";

import { useEffect, useCallback } from "react";
import type { SimpleLandingPageConfig } from "@/types/landing-page";
import HeroTemplateRenderer from "@/templates/hero";
import { LandingPageThemeProvider } from "@/templates/hero/ThemeProvider";
import ProfileIconDropdown from "@/components/ProfileIconDropdown";

interface LandingPageRendererProps {
  config: SimpleLandingPageConfig;
  tenantId: string;
}

declare const CallyEmbed:
  | { open: (widget: string) => void; close: () => void; isOpen: () => boolean }
  | undefined;

/**
 * Public landing page renderer
 * Renders the selected template without edit mode
 * Uses embed.js popup mode for booking/contact actions
 */
export default function LandingPageRenderer({
  config,
  tenantId,
}: LandingPageRendererProps) {
  // Load embed.js in popup mode
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- embed config is a plain object on window
    (window as any).CallyEmbedConfig = {
      tenantId,
      widget: "booking",
      mode: "popup",
    };
    const script = document.createElement("script");
    script.src = "/embed.js";
    document.body.appendChild(script);
    return () => {
      script.remove();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cleanup global
      delete (window as any).CallyEmbed;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cleanup global
      delete (window as any).CallyEmbedConfig;
      document.getElementById("cally-embed-overlay")?.remove();
      document.getElementById("cally-embed-styles")?.remove();
    };
  }, [tenantId]);

  const handleButtonClick = useCallback(() => {
    const action = config.button?.action || "booking";
    if (typeof CallyEmbed !== "undefined") {
      CallyEmbed.open(action);
    } else {
      console.error("[DBG][LandingPageRenderer] CallyEmbed not loaded yet");
    }
  }, [config.button?.action]);

  return (
    <LandingPageThemeProvider palette={config.theme?.palette}>
      <ProfileIconDropdown tenantId={tenantId} />
      <HeroTemplateRenderer
        config={config}
        isEditing={false}
        onButtonClick={handleButtonClick}
      />
    </LandingPageThemeProvider>
  );
}
