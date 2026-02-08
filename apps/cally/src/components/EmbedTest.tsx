"use client";

import { useEffect } from "react";

/**
 * Temporary test component for embed.js — loads the booking widget in popup mode.
 * Remove after testing.
 */
export default function EmbedTest({ tenantId }: { tenantId: string }) {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- embed config is a plain object on window
    (window as any).CallyEmbedConfig = {
      tenantId,
      widget: "booking",
      mode: "popup",
      container: "#cally-embed-test",
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
      // Remove any injected elements
      document.getElementById("cally-embed-trigger")?.remove();
      document.getElementById("cally-embed-overlay")?.remove();
      document.getElementById("cally-embed-styles")?.remove();
    };
  }, [tenantId]);

  return <div id="cally-embed-test" />;
}
